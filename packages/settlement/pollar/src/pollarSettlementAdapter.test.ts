import test from "node:test";
import assert from "node:assert/strict";
import { newIntentId, newRecipientId, newUserId } from "@mova/domain";
import type { PaymentIntent } from "@mova/domain";
import { PollarSettlementAdapter } from "./pollarSettlementAdapter.js";
import { SimulatedPollarClient } from "./pollarClient.js";

// These tests assert MOCK-specific behavior, so they inject a
// SimulatedPollarClient explicitly rather than relying on
// createPollarClient()'s POLLAR_SECRET_KEY-based default — that keeps
// them deterministic regardless of the ambient environment (e.g. a
// developer running tests locally with a real secret key exported).
function makeMockAdapter(): PollarSettlementAdapter {
  return new PollarSettlementAdapter({ client: new SimulatedPollarClient() });
}

function makeIntent(): PaymentIntent {
  return {
    id: newIntentId(),
    createdAt: new Date().toISOString(),
    sender: { userId: newUserId() },
    recipient: { recipientId: newRecipientId() },
    source: { country: "NG", currency: "NGN", amount: "50000" },
    destination: { country: "BO", currency: "BOB" },
    constraints: { expiry: new Date(Date.now() + 60_000).toISOString() },
  };
}

test("capability is never reported as REAL or bare SANDBOX under simulated conditions", () => {
  const adapter = makeMockAdapter();
  assert.notEqual(adapter.capability, "REAL");
  assert.notEqual(adapter.capability, "SANDBOX");
  assert.equal(adapter.capability, "MOCK");
});

test("getQuote round-trips through the simulator and flags the BOB leg honestly", async () => {
  const adapter = makeMockAdapter();
  const intent = makeIntent();

  const quote = await adapter.getQuote(intent);

  assert.equal(quote.intentId, intent.id);
  assert.equal(quote.provider, "pollar");
  assert.equal(quote.metadata?.capability, "MOCK");
  assert.equal(quote.metadata?.bobLegCapability, "SEMI_MANUAL");
  assert.equal(typeof quote.metadata?.pollarQuoteRef, "string");
  assert.ok(Number(quote.destinationAmount) < Number(quote.sourceAmount));
});

test("createTransfer + getStatus progress the same way the underlying simulator does", async () => {
  const adapter = makeMockAdapter();
  const intent = makeIntent();
  const quote = await adapter.getQuote(intent);

  const transfer = await adapter.createTransfer(intent, quote);
  assert.equal(transfer.intentId, intent.id);
  assert.equal(transfer.quoteId, quote.id);
  assert.equal(transfer.railId, adapter.id);
  assert.equal(transfer.status, "PENDING");

  const afterFirstPoll = await adapter.getStatus(transfer.id);
  assert.equal(afterFirstPoll, "PROCESSING");

  const afterSecondPoll = await adapter.getStatus(transfer.id);
  assert.equal(afterSecondPoll, "COMPLETED");
});

test("createTransfer rejects a quote this adapter did not produce", async () => {
  const adapter = makeMockAdapter();
  const intent = makeIntent();
  const quote = await adapter.getQuote(intent);
  const foreignQuote = { ...quote, metadata: {} };

  await assert.rejects(() => adapter.createTransfer(intent, foreignQuote));
});

test("getStatus rejects unknown transfer ids", async () => {
  const adapter = makeMockAdapter();
  await assert.rejects(() => adapter.getStatus("unknown-transfer-id"));
});

test("capability reports SANDBOX once wired to a client in REAL mode, independent of whether a given call succeeds", async () => {
  // A RealPollarClient with a bad key still reports mode "REAL" (it's
  // genuinely wired and attempting live calls) — capability describes
  // that wiring, not any single call's outcome. See pollarSettlementAdapter.ts.
  const { RealPollarClient } = await import("./pollarClient.js");
  const adapter = new PollarSettlementAdapter({
    client: new RealPollarClient("sec_testnet_definitely_invalid_0000000000"),
  });
  assert.equal(adapter.capability, "SANDBOX");
});
