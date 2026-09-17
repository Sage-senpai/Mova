import assert from "node:assert/strict";
import test from "node:test";

import { newIntentId, newRecipientId, newUserId, type PaymentIntent } from "@mova/domain";

import { DemoStablecoinRail } from "./index.js";

function makeIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    id: newIntentId(),
    createdAt: new Date().toISOString(),
    sender: { userId: newUserId() },
    recipient: { recipientId: newRecipientId() },
    source: { country: "NG", currency: "NGN", amount: "150000.00" },
    destination: { country: "BO", currency: "BOB", minimumReceived: "1900.00" },
    constraints: { expiry: new Date(Date.now() + 3600_000).toISOString() },
    ...overrides,
  };
}

test("getQuote returns a well-formed MOCK quote", async () => {
  const rail = new DemoStablecoinRail();
  const intent = makeIntent();

  const quote = await rail.getQuote(intent);

  assert.equal(quote.intentId, intent.id);
  assert.equal(typeof quote.sourceAmount, "string");
  assert.equal(typeof quote.destinationAmount, "string");
  assert.equal(typeof quote.fee, "string");
  assert.ok(quote.estimatedDurationSeconds > 0);
  assert.equal(quote.provider, "mock-demo-stablecoin");
  assert.equal(quote.metadata?.capability, "MOCK");
  assert.equal(typeof quote.metadata?.confidence, "number");
  assert.ok((quote.metadata?.confidence as number) > 0 && (quote.metadata?.confidence as number) <= 1);
  assert.ok(new Date(quote.expiresAt).getTime() > new Date(quote.createdAt).getTime());
});

test("getStatus throws a clear error for an unknown transfer id", async () => {
  const rail = new DemoStablecoinRail();
  await assert.rejects(() => rail.getStatus("does-not-exist"), /unknown transfer id/i);
});

test("status progresses PENDING -> PROCESSING -> COMPLETED as time elapses", async () => {
  const rail = new DemoStablecoinRail();
  const intent = makeIntent();
  const quote = await rail.getQuote(intent);
  const transfer = await rail.createTransfer(intent, quote);

  const createdMs = new Date(transfer.createdAt).getTime();
  const etaMs = quote.estimatedDurationSeconds * 1000;

  assert.equal(await rail.getStatus(transfer.id, createdMs), "PENDING");
  assert.equal(await rail.getStatus(transfer.id, createdMs + etaMs * 0.5), "PROCESSING");
  assert.equal(await rail.getStatus(transfer.id, createdMs + etaMs * 1.1), "COMPLETED");
});

test("cancel marks a known transfer CANCELLED and is a no-op for an unknown id", async () => {
  const rail = new DemoStablecoinRail();
  const intent = makeIntent();
  const quote = await rail.getQuote(intent);
  const transfer = await rail.createTransfer(intent, quote);

  await rail.cancel!(transfer.id);
  assert.equal(await rail.getStatus(transfer.id), "CANCELLED");

  // Unknown id: should resolve without throwing.
  await rail.cancel!("does-not-exist");
});
