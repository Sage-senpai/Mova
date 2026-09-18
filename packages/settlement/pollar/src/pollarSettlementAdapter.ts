import { newQuoteId, newRouteId } from "@mova/domain";
import type { PaymentIntent, PaymentRail, Quote, Transfer, TransferStatus } from "@mova/domain";
import { createPollarClient } from "./pollarClient.js";
import type { PollarClient, PollarTransferStatus } from "./pollarClient.js";

/**
 * PollarSettlementAdapter — MOVA's `PaymentRail` implementation over
 * Pollar's embedded Stellar wallet SDK (`@pollar/react` / `@pollar/core`).
 * Nothing outside `packages/settlement/pollar` should ever import
 * `PollarClient` directly; `routing-engine` and `apps/web` only see this
 * class through the `PaymentRail` port (packages/domain/src/routes/rail.ts).
 *
 * `kind` is "STABLECOIN", not "SETTLEMENT": Pollar's verified primitives
 * (wallet creation, USDC trustline, send/receive/quote/swap — see
 * docs/pollar-integration.md) are a stablecoin rail MOVA orchestrates on
 * top of, not a multi-leg settlement orchestrator in their own right.
 * `RailKind` also has a "SETTLEMENT" value; that's reserved for a rail
 * (if one is ever built) that models an end-to-end settlement flow
 * itself. Pollar is the USDC leg such a flow could use.
 *
 * The BOB/Bolivia leg: because a BOB off-ramp is not confirmed on
 * Pollar's own docs (only third-party hackathon repos claim it — see
 * docs/pollar-integration.md and decisions.md ADR-006), this adapter
 * never claims to execute it. Every `Quote` this adapter returns carries
 * `metadata.bobLegCapability: "SEMI_MANUAL"` so callers can render the
 * NGN→USDC leg (this adapter's actual work) distinctly from the
 * USDC→BOB leg (an operator-confirmed step). `Transfer` has no metadata
 * field in the fixed domain contract, so that flag lives only on the
 * `Quote` referenced by `Transfer.quoteId` — callers needing it for a
 * transfer should look up the originating quote. This package does not
 * own the `PaymentState` machine (packages/domain/src/payments/paymentState.ts);
 * it only reports the stablecoin leg's `TransferStatus`. The wider
 * payment is expected to sit in `DESTINATION_PENDING` while the BOB leg
 * is manually confirmed, but transitioning that state is a caller's job,
 * not this adapter's.
 */
export class PollarSettlementAdapter implements PaymentRail {
  readonly id: string;
  readonly kind = "STABLECOIN" as const;

  private readonly client: PollarClient;
  private readonly providerRefByTransferId = new Map<string, string>();

  constructor(options: { id?: string; client?: PollarClient } = {}) {
    this.id = options.id ?? "pollar-stellar-usdc";
    this.client = options.client ?? createPollarClient();
  }

  /**
   * Honesty gate (ADR-004: capability is a required field, not a doc
   * comment; ADR-006: the Bolivia leg — and by extension this whole
   * rail's default posture — must never overstate what's real).
   *
   * Resolves to "SANDBOX" once `POLLAR_SECRET_KEY` is configured (see
   * pollarClient.ts's `createPollarClient()`), meaning wallet creation is
   * genuinely calling Pollar's live Server API — not merely that every
   * call happens to succeed. A specific `createTransfer` call can still
   * fall back to a simulated wallet if Pollar's API errors (see
   * `RealPollarClient.createWallet`); that per-call outcome is carried on
   * `Transfer.providerRef` (a real G-address vs. a `simtx_` ref), not
   * here — `capability` describes the rail's wiring, not any one call.
   */
  get capability(): PaymentRail["capability"] {
    return this.client.mode === "REAL" ? "SANDBOX" : "MOCK";
  }

  async getQuote(intent: PaymentIntent): Promise<Quote> {
    const pollarQuote = await this.client.getUsdcQuote({
      sourceCurrency: intent.source.currency,
      sourceAmount: intent.source.amount,
      destinationCurrency: "USDC",
    });

    const quote: Quote = {
      id: newQuoteId(),
      intentId: intent.id,
      sourceAmount: intent.source.amount,
      destinationAmount: pollarQuote.destinationAmount,
      fee: pollarQuote.fee,
      rate: pollarQuote.rate,
      estimatedDurationSeconds: 30,
      // routing-engine assembles the final Route (with its own RouteId)
      // from candidate quotes across rails; PaymentRail.getQuote only
      // receives the intent, so this adapter mints a placeholder RouteId
      // to keep the Quote structurally valid on its own.
      routeId: newRouteId(),
      createdAt: new Date().toISOString(),
      expiresAt: pollarQuote.expiresAt,
      provider: "pollar",
      metadata: {
        capability: this.capability,
        pollarQuoteRef: pollarQuote.quoteRef,
        // See class doc-comment: the BOB conversion leg is never REAL or
        // SANDBOX, regardless of demo pressure to claim otherwise.
        bobLegCapability: "SEMI_MANUAL",
      },
    };

    return quote;
  }

  async createTransfer(intent: PaymentIntent, quote: Quote): Promise<Transfer> {
    const pollarQuoteRef = quote.metadata?.pollarQuoteRef;
    if (typeof pollarQuoteRef !== "string") {
      throw new Error(
        "PollarSettlementAdapter.createTransfer: quote was not produced by " +
          "this adapter (missing metadata.pollarQuoteRef)"
      );
    }

    // This is the actual "hands off to Pollar" moment: with a real
    // POLLAR_SECRET_KEY configured, this genuinely creates (and funds) a
    // Stellar testnet wallet via Pollar's live Server API — verifiable
    // independently on a testnet explorer. See pollarClient.ts for
    // exactly what is and isn't real about the call that follows.
    const wallet = await this.client.createWallet(intent.recipient.recipientId);
    if (wallet.real) {
      console.log(
        `[@mova/settlement-pollar] Real Pollar-created Stellar testnet wallet: ${wallet.address}`,
      );
    }

    const sent = await this.client.sendUsdc({
      quoteRef: pollarQuoteRef,
      destinationAddress: wallet.address,
    });

    const transferId = `trf_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    this.providerRefByTransferId.set(transferId, sent.transferRef);

    const now = new Date().toISOString();
    const transfer: Transfer = {
      id: transferId,
      railId: this.id,
      intentId: intent.id,
      quoteId: quote.id,
      status: toTransferStatus(sent.status),
      createdAt: now,
      updatedAt: now,
      // The recipient's real Stellar address when wallet creation genuinely
      // succeeded against Pollar's live API, so callers/UI can show and
      // link out to real, independently-verifiable testnet proof — falls
      // back to the (simulated) transfer ref otherwise.
      providerRef: wallet.real ? wallet.address : sent.transferRef,
    };
    return transfer;
  }

  async getStatus(id: string): Promise<TransferStatus> {
    const providerRef = this.providerRefByTransferId.get(id);
    if (!providerRef) {
      throw new Error(`PollarSettlementAdapter.getStatus: unknown transfer id "${id}"`);
    }
    const result = await this.client.getTransferStatus(providerRef);
    return toTransferStatus(result.status);
  }
}

function toTransferStatus(status: PollarTransferStatus): TransferStatus {
  switch (status) {
    case "submitted":
      return "PENDING";
    case "pending":
      return "PROCESSING";
    case "completed":
      // The USDC leg settling on Stellar testnet, not the BOB leg. The
      // wider payment's PaymentState machine (owned outside this
      // package) is expected to move to DESTINATION_PENDING here, then
      // COMPLETED only once the SEMI_MANUAL BOB conversion is confirmed.
      return "COMPLETED";
    case "failed":
      return "FAILED";
  }
}
