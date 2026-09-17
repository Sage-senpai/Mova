import {
  newQuoteId,
  newRouteId,
  type PaymentIntent,
  type PaymentRail,
  type Quote,
  type RailKind,
  type Transfer,
  type TransferStatus,
} from "@mova/domain";

/**
 * ============================================================================
 * DemoStablecoinRail — illustrative placeholder, NOT the real Pollar adapter
 * ============================================================================
 *
 * Per docs/african-rails.md, the production shape of this rail is:
 *
 *   capability: "SANDBOX" where it delegates to a real Pollar USDC quote
 *   call, and "MOCK" only for the parts Pollar doesn't expose.
 *
 * That real, testnet-backed adapter is being built separately in
 * packages/settlement/pollar by a sibling agent. This package
 * deliberately does NOT import from packages/settlement/pollar — it is
 * the illustrative/placeholder implementation described in the spec,
 * showing the mock quote-generation *shape* a stablecoin rail would need
 * (fee/ETA/confidence, quote lifecycle, transfer status progression)
 * without claiming any real Pollar connectivity.
 *
 * Accordingly, `capability` here is declared "MOCK", not "SANDBOX" — see
 * docs/security.md's "never fabricate a capability" principle. Wiring
 * this up to the real Pollar SANDBOX adapter (or replacing it outright)
 * is future work, not something this class pretends to already do.
 * ============================================================================
 */

/**
 * Illustrative NGN/local -> destination FX ratios, keyed "SRC:DST".
 * These are NOT market data. They exist only so mock quotes are
 * internally consistent (a bigger source amount produces a
 * proportionally bigger destination amount) for demo purposes. Unknown
 * pairs fall back to a transparent 1:1 ratio rather than a
 * fabricated-looking cross rate.
 */
const ILLUSTRATIVE_RATES: Record<string, number> = {
  "NGN:BOB": 0.0133,
  "NGN:USD": 0.00065,
  "NGN:USDC": 0.00065,
  "USD:BOB": 12.5,
  "USDC:BOB": 12.5,
};

function illustrativeRate(sourceCurrency: string, destCurrency: string): number {
  if (sourceCurrency === destCurrency) return 1;
  const direct = ILLUSTRATIVE_RATES[`${sourceCurrency}:${destCurrency}`];
  if (direct !== undefined) return direct;
  const inverse = ILLUSTRATIVE_RATES[`${destCurrency}:${sourceCurrency}`];
  if (inverse !== undefined) return 1 / inverse;
  return 1;
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Mock arithmetic only: real money handling in MOVA stays decimal-string
 * end to end (see packages/domain/src/money.ts). Floats here are fine
 * because this class never produces a real settlement number, only an
 * illustrative one, and the result is immediately re-serialized to a
 * fixed-precision decimal string. */
function toFixedAmount(n: number): string {
  return Math.max(0, n).toFixed(2);
}

type TransferRecord = {
  transfer: Transfer;
  createdAtMs: number;
  estimatedDurationMs: number;
};

/** Fraction of the quoted ETA that must elapse before a PENDING transfer
 * is reported as PROCESSING. Tuned for demo pacing, not measured from any
 * real settlement pipeline. */
const PROCESSING_START_RATIO = 0.2;

/**
 * MOCK placeholder for a USDC/stablecoin settlement leg. Models the
 * characteristic MOVA expects from that leg once wired to the real
 * Pollar adapter: the lowest typical latency of the three rails (an
 * on-chain settlement hop, not a bank or agent network), with confidence
 * in between the bank and P2P rails (see docs/african-rails.md).
 *
 * capability: "MOCK" for THIS package specifically — see the module
 * header above for why this is not "SANDBOX" and not Pollar-backed.
 */
export class DemoStablecoinRail implements PaymentRail {
  readonly id = "rail-stablecoin-demo-mock";
  readonly kind: RailKind = "STABLECOIN";
  readonly capability = "MOCK" as const;

  private readonly transfers = new Map<string, TransferRecord>();

  async getQuote(intent: PaymentIntent): Promise<Quote> {
    const parsedSource = Number.parseFloat(intent.source.amount);
    const sourceAmount = Number.isFinite(parsedSource) ? parsedSource : 0;

    // Fee: 1.18%-1.48% of source amount — between the bank and P2P
    // rails, roughly flat since a real on-chain leg's cost is dominated
    // by network fees rather than counterparty spread. Chosen so a
    // ~150,000-unit transfer lands near the ~1,995 illustrative example
    // in docs/african-rails.md — a demo tuning constant, not a real
    // Pollar quote.
    const feeRatio = randomInRange(0.0118, 0.0148);
    const fee = sourceAmount * feeRatio;

    const rate = illustrativeRate(intent.source.currency, intent.destination.currency);
    let destinationAmount = Math.max(0, sourceAmount - fee) * rate;

    const minimumReceived = intent.destination.minimumReceived
      ? Number.parseFloat(intent.destination.minimumReceived)
      : undefined;
    if (
      minimumReceived !== undefined &&
      Number.isFinite(minimumReceived) &&
      destinationAmount > 0 &&
      destinationAmount < minimumReceived &&
      minimumReceived / destinationAmount <= 1.5
    ) {
      // Nudge up to satisfy the stated minimum when it's in a plausible
      // range for our illustrative rate — we're not modeling real FX,
      // just keeping the quote internally consistent with the intent.
      destinationAmount = minimumReceived * 1.001;
    }

    // ETA: ~1.6-3.0 minutes — the lowest latency of the three rails,
    // modeling an on-chain settlement hop rather than a bank/agent
    // network round trip.
    const estimatedDurationSeconds = Math.round(randomInRange(98, 178));
    // Confidence: 96.3%-98.3% — between the bank rail (highest) and the
    // P2P rail (lowest, most variable). Illustrative only, not a
    // measured success rate.
    const confidence = randomInRange(0.963, 0.983);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 120_000); // 120s quote validity

    return {
      id: newQuoteId(),
      intentId: intent.id,
      sourceAmount: sourceAmount.toFixed(2),
      destinationAmount: toFixedAmount(destinationAmount),
      fee: toFixedAmount(fee),
      rate: rate.toFixed(6),
      estimatedDurationSeconds,
      // Placeholder RouteId stamp only. Assembling an actual Route is the
      // routing-engine's job (packages/domain/src/routes/route.ts) — this
      // rail produces Quotes, never Route objects.
      routeId: newRouteId(),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      provider: "mock-demo-stablecoin",
      metadata: {
        capability: "MOCK",
        confidence: Number(confidence.toFixed(4)),
        rail: this.kind,
        sourceCurrency: intent.source.currency,
        destinationCurrency: intent.destination.currency,
        note:
          "Illustrative placeholder for the future Pollar-backed SANDBOX stablecoin rail " +
          "(see packages/settlement/pollar); this package's numbers are mock-generated, not a real quote.",
      },
    };
  }

  async createTransfer(intent: PaymentIntent, quote: Quote): Promise<Transfer> {
    const nowIso = new Date().toISOString();
    const transfer: Transfer = {
      id: `trf_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
      railId: this.id,
      intentId: intent.id,
      quoteId: quote.id,
      status: "PENDING",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.transfers.set(transfer.id, {
      transfer,
      createdAtMs: Date.now(),
      estimatedDurationMs: Math.max(1, quote.estimatedDurationSeconds) * 1000,
    });
    return transfer;
  }

  /**
   * `now` is an optional seam for deterministic tests (see
   * src/index.test.ts) — PaymentRail callers can ignore it entirely and
   * get real time-based progression.
   *
   * Behavior for an unknown id is a thrown Error, not a silent fallback
   * status: a status poll should never lie about a transfer it has no
   * record of.
   */
  async getStatus(id: string, now: number = Date.now()): Promise<TransferStatus> {
    const record = this.transfers.get(id);
    if (!record) {
      throw new Error(`DemoStablecoinRail: unknown transfer id "${id}"`);
    }
    if (record.transfer.status === "CANCELLED" || record.transfer.status === "FAILED") {
      return record.transfer.status;
    }

    const elapsedMs = now - record.createdAtMs;
    let status: TransferStatus;
    if (elapsedMs >= record.estimatedDurationMs) {
      status = "COMPLETED";
    } else if (elapsedMs >= record.estimatedDurationMs * PROCESSING_START_RATIO) {
      status = "PROCESSING";
    } else {
      status = "PENDING";
    }

    record.transfer.status = status;
    record.transfer.updatedAt = new Date(now).toISOString();
    return status;
  }

  /**
   * Best-effort no-op when the id is unknown (unlike getStatus, which
   * throws) — cancellation is inherently idempotent/fire-and-forget in
   * this mock, per docs/african-rails.md.
   */
  async cancel(id: string, now: number = Date.now()): Promise<void> {
    const record = this.transfers.get(id);
    if (!record) return;
    if (record.transfer.status === "COMPLETED") return;
    record.transfer.status = "CANCELLED";
    record.transfer.updatedAt = new Date(now).toISOString();
  }
}
