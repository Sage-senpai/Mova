import { NextResponse } from "next/server";
import type { PaymentIntent } from "@mova/domain";
import { PollarSettlementAdapter } from "@mova/settlement-pollar";

/**
 * The real "hands off to Pollar" step for Screen 06 (Live Settlement).
 * Runs the actual PollarSettlementAdapter — with POLLAR_SECRET_KEY
 * configured, `createTransfer` genuinely calls Pollar's live Server API
 * to create and fund a Stellar testnet wallet for the recipient. See
 * packages/settlement/pollar/src/pollarClient.ts for exactly what is and
 * isn't real, and docs/pollar-integration.md for the full writeup.
 */
export async function POST(request: Request) {
  const { intent } = (await request.json()) as { intent: PaymentIntent };

  const adapter = new PollarSettlementAdapter();
  const quote = await adapter.getQuote(intent);
  const transfer = await adapter.createTransfer(intent, quote);

  // A real Stellar public key is always "G" + 55 more base32 chars (56
  // total); the simulated fallback's transferRef never matches that
  // shape (see pollarSettlementAdapter.ts's providerRef assignment).
  const isRealWallet = /^G[A-Z2-7]{55}$/.test(transfer.providerRef ?? "");

  return NextResponse.json({
    capability: adapter.capability,
    real: isRealWallet,
    providerRef: transfer.providerRef,
    transferStatus: transfer.status,
    explorerUrl: isRealWallet
      ? `https://stellar.expert/explorer/testnet/account/${transfer.providerRef}`
      : null,
    bobLegCapability: quote.metadata?.bobLegCapability ?? "SEMI_MANUAL",
  });
}
