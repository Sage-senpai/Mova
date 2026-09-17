import test from "node:test";
import assert from "node:assert/strict";
import { newIntentId, newRecipientId, newUserId } from "@mova/domain";
import type { PaymentIntent } from "@mova/domain";
import { PollarSettlementAdapter } from "./pollarSettlementAdapter.js";

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
  const adapter = new PollarSettlementAdapter();
  assert.notEqual(adapter.capability, "REAL");
  assert.notEqual(adapter.capability, "SANDBOX");
  assert.equal(adapter.capability, "MOCK");
});

test("getQuote round-trips through the simulator and flags the BOB leg honestly", async () => {
  const adapter = new PollarSettlementAdapter();
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
  const adapter = new PollarSettlementAdapter();
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
  const adapter = new PollarSettlementAdapter();
  const intent = makeIntent();
  const quote = await adapter.getQuote(intent);
  const foreignQuote = { ...quote, metadata: {} };

  await assert.rejects(() => adapter.createTransfer(intent, foreignQuote));
});

test("getStatus rejects unknown transfer ids", async () => {
  const adapter = new PollarSettlementAdapter();
  await assert.rejects(() => adapter.getStatus("unknown-transfer-id"));
});
