import test from "node:test";
import assert from "node:assert/strict";
import {
  IllegalPaymentTransitionError,
  newIntentId,
  newPaymentId,
  newQuoteId,
  newRouteId,
  type Payment,
} from "@mova/domain";
import { InMemoryLedger } from "./ledger.js";

function makePayment(overrides: Partial<Payment> = {}): Payment {
  const now = new Date().toISOString();
  return {
    id: newPaymentId(),
    intentId: newIntentId(),
    quoteId: newQuoteId(),
    routeId: newRouteId(),
    state: "CREATED",
    history: [{ from: null, to: "CREATED", at: now }],
    sourceAmount: "50",
    destinationAmount: "49",
    fee: "1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("transitionPayment applies a legal transition and appends history", () => {
  const ledger = new InMemoryLedger();
  const payment = makePayment();
  ledger.createPayment(payment);

  const updated = ledger.transitionPayment(payment.id, "QUOTED", "quote received");

  assert.equal(updated.state, "QUOTED");
  assert.equal(updated.history.length, 2);
  assert.deepEqual(
    { from: updated.history[1]?.from, to: updated.history[1]?.to, reason: updated.history[1]?.reason },
    { from: "CREATED", to: "QUOTED", reason: "quote received" },
  );
  assert.equal(ledger.getPayment(payment.id)?.state, "QUOTED");
});

test("transitionPayment throws IllegalPaymentTransitionError on an illegal transition", () => {
  const ledger = new InMemoryLedger();
  const payment = makePayment();
  ledger.createPayment(payment);

  assert.throws(
    () => ledger.transitionPayment(payment.id, "COMPLETED"),
    IllegalPaymentTransitionError,
  );
  // State must not have changed as a side effect of the failed attempt.
  assert.equal(ledger.getPayment(payment.id)?.state, "CREATED");
});

test("reserveNonce accepts a nonce once and rejects reuse", () => {
  const ledger = new InMemoryLedger();

  assert.equal(ledger.reserveNonce("agt_1", "nonce-a"), true);
  assert.equal(ledger.reserveNonce("agt_1", "nonce-a"), false);
  // Same nonce from a different sender is a distinct pair, so it's fine.
  assert.equal(ledger.reserveNonce("agt_2", "nonce-a"), true);
});

test("recordSpend accumulates per agent/day and keeps different days separate", () => {
  const ledger = new InMemoryLedger();

  ledger.recordSpend("agt_1", "10", "2026-09-17");
  ledger.recordSpend("agt_1", "15.5", "2026-09-17");
  ledger.recordSpend("agt_1", "100", "2026-09-18");
  ledger.recordSpend("agt_2", "5", "2026-09-17");

  assert.equal(ledger.getSpendToday("agt_1", "2026-09-17"), "25.5");
  assert.equal(ledger.getSpendToday("agt_1", "2026-09-18"), "100");
  assert.equal(ledger.getSpendToday("agt_2", "2026-09-17"), "5");
  assert.equal(ledger.getSpendToday("agt_3", "2026-09-17"), "0");
});

test("recordAuditEvent stores events and getAuditEvents filters by intentId/paymentId", () => {
  const ledger = new InMemoryLedger();
  const intentId = newIntentId();
  const paymentId = newPaymentId();
  const otherPaymentId = newPaymentId();

  ledger.recordAuditEvent({
    id: "evt_1" as any,
    type: "intent.created",
    intentId,
    at: new Date().toISOString(),
  });
  ledger.recordAuditEvent({
    id: "evt_2" as any,
    type: "payment.completed",
    paymentId,
    at: new Date().toISOString(),
  });
  ledger.recordAuditEvent({
    id: "evt_3" as any,
    type: "payment.completed",
    paymentId: otherPaymentId,
    at: new Date().toISOString(),
  });

  assert.equal(ledger.getAuditEvents().length, 3);
  assert.equal(ledger.getAuditEvents({ intentId }).length, 1);
  assert.equal(ledger.getAuditEvents({ paymentId }).length, 1);
});
