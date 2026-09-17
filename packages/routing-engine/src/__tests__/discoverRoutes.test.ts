import test from "node:test";
import assert from "node:assert/strict";
import type { PaymentIntent, PaymentRail, Quote } from "@mova/domain";
import { newIntentId, newQuoteId, newRecipientId, newRouteId, newUserId } from "@mova/domain";
import { discoverRoutes } from "../discoverRoutes.js";

function makeIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    id: newIntentId(),
    createdAt: new Date().toISOString(),
    sender: { userId: newUserId() },
    recipient: { recipientId: newRecipientId() },
    source: { country: "NG", currency: "NGN", amount: "100000" },
    destination: { country: "BO", currency: "BOB" },
    constraints: { expiry: new Date(Date.now() + 3_600_000).toISOString() },
    ...overrides,
  };
}

function quoteFor(intent: PaymentIntent, overrides: Partial<Quote> = {}): Quote {
  return {
    id: newQuoteId(),
    intentId: intent.id,
    sourceAmount: intent.source.amount,
    destinationAmount: "500",
    fee: "10",
    estimatedDurationSeconds: 300,
    routeId: newRouteId(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    provider: "test-provider",
    ...overrides,
  };
}

function makeRail(overrides: {
  id?: string;
  kind?: PaymentRail["kind"];
  capability?: PaymentRail["capability"];
  getQuoteImpl?: (intent: PaymentIntent) => Promise<Quote>;
}): PaymentRail {
  return {
    id: overrides.id ?? "rail-1",
    kind: overrides.kind ?? "BANK",
    capability: overrides.capability ?? "MOCK",
    getQuote: overrides.getQuoteImpl ?? (async (intent) => quoteFor(intent)),
    createTransfer: async () => {
      throw new Error("not implemented in test");
    },
    getStatus: async () => "PENDING",
  };
}

test("a route violating maxFee is excluded from the results, not just down-ranked", async () => {
  const intent = makeIntent({
    constraints: { expiry: new Date(Date.now() + 3_600_000).toISOString(), maxFee: "5" },
  });
  const rail = makeRail({
    id: "expensive-rail",
    getQuoteImpl: async (i) => quoteFor(i, { fee: "50" }), // well over maxFee
  });

  const routes = await discoverRoutes(intent, [rail]);

  assert.equal(routes.length, 0);
});

test("with multiple valid rails, the highest-scoring route sorts first", async () => {
  const intent = makeIntent();
  const cheapReliableRail = makeRail({
    id: "cheap-rail",
    kind: "BANK",
    capability: "REAL",
    getQuoteImpl: async (i) =>
      quoteFor(i, { fee: "1", destinationAmount: "990", estimatedDurationSeconds: 60 }),
  });
  const pricierLessReliableRail = makeRail({
    id: "pricier-rail",
    kind: "P2P",
    capability: "MOCK",
    getQuoteImpl: async (i) =>
      quoteFor(i, { fee: "40", destinationAmount: "700", estimatedDurationSeconds: 7200 }),
  });

  const routes = await discoverRoutes(intent, [pricierLessReliableRail, cheapReliableRail], "BALANCED");

  assert.equal(routes.length, 2);
  assert.equal(routes[0]?.hops[0]?.railKind, "BANK");
  assert.ok(routes[0]!.score.total >= routes[1]!.score.total);
});

test("a rail whose getQuote throws does not crash discoverRoutes; other rails still return", async () => {
  const intent = makeIntent();
  const brokenRail = makeRail({
    id: "broken-rail",
    kind: "BANK",
    getQuoteImpl: async () => {
      throw new Error("provider outage");
    },
  });
  const healthyRail = makeRail({
    id: "healthy-rail",
    kind: "STABLECOIN",
    getQuoteImpl: async (i) => quoteFor(i),
  });

  const routes = await discoverRoutes(intent, [brokenRail, healthyRail]);

  assert.equal(routes.length, 1);
  assert.equal(routes[0]?.hops[0]?.railKind, "STABLECOIN");
});
