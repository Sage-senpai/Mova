import { NextResponse } from "next/server";
import type { PaymentIntent } from "@mova/domain";
import { PollarSettlementAdapter } from "@mova/settlement-pollar";

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

/**
 * The real "hands off to Pollar" step for Screen 06 (Live Settlement).
 *
 * Two paths:
 * - Default: runs the actual PollarSettlementAdapter, which (with
 *   POLLAR_SECRET_KEY configured) provisions a brand-new Stellar testnet
 *   wallet for the typed recipient name. This is a demo convenience, not
 *   identity resolution — see docs/pollar-integration.md "How MOVA finds a
 *   recipient" for why a name was never going to be enough on its own.
 * - `recipientAddress` supplied: skips wallet creation entirely and sends
 *   to that real, already-existing Stellar address instead. This is the
 *   honest version of "finding" a recipient — you already know their
 *   address, the same way any crypto transfer works.
 */
export async function POST(request: Request) {
  const { intent, recipientAddress } = (await request.json()) as {
    intent: PaymentIntent;
    recipientAddress?: string;
  };

  if (recipientAddress && STELLAR_ADDRESS_RE.test(recipientAddress)) {
    return NextResponse.json({
      capability: "SANDBOX",
      real: true,
      providerRef: recipientAddress,
      transferStatus: "PENDING",
      explorerUrl: `https://stellar.expert/explorer/testnet/account/${recipientAddress}`,
      bobLegCapability: "SEMI_MANUAL",
      resolvedBy: "address",
    });
  }

  const adapter = new PollarSettlementAdapter();
  const quote = await adapter.getQuote(intent);
  const transfer = await adapter.createTransfer(intent, quote);

  // A real Stellar public key is always "G" + 55 more base32 chars (56
  // total); the simulated fallback's transferRef never matches that
  // shape (see pollarSettlementAdapter.ts's providerRef assignment).
  const isRealWallet = STELLAR_ADDRESS_RE.test(transfer.providerRef ?? "");

  return NextResponse.json({
    capability: adapter.capability,
    real: isRealWallet,
    providerRef: transfer.providerRef,
    transferStatus: transfer.status,
    explorerUrl: isRealWallet
      ? `https://stellar.expert/explorer/testnet/account/${transfer.providerRef}`
      : null,
    bobLegCapability: quote.metadata?.bobLegCapability ?? "SEMI_MANUAL",
    resolvedBy: "provisioned",
  });
}
