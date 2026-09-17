import test from "node:test";
import assert from "node:assert/strict";
import {
  newAgentId,
  newIntentId,
  newPolicyId,
  newRecipientId,
  newUserId,
  type AgentPolicy,
  type PaymentIntent,
} from "@mova/domain";
import { evaluatePolicy } from "./evaluate.js";

const NOW = new Date("2026-09-17T12:00:00.000Z");
const FUTURE_EXPIRY = "2026-09-17T13:00:00.000Z";
const PAST_EXPIRY = "2026-09-17T11:00:00.000Z";

function makePolicy(overrides: Partial<AgentPolicy> = {}): AgentPolicy {
  return {
    id: newPolicyId(),
    agentId: newAgentId(),
    maxPerTransaction: "100",
    dailyLimit: "500",
    currency: "USD",
    allowedDestinations: ["rcp_allowed"],
    allowedAssets: ["USD", "KES"],
    status: "ACTIVE",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function makeIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    id: newIntentId(),
    createdAt: NOW.toISOString(),
    sender: { userId: newUserId(), agentId: newAgentId() },
    recipient: { recipientId: "rcp_allowed" as PaymentIntent["recipient"]["recipientId"] },
    source: { country: "US", currency: "USD", amount: "50" },
    destination: { country: "KE", currency: "KES" },
    constraints: { expiry: FUTURE_EXPIRY },
    ...overrides,
  };
}

test("PASS on a clean case within all limits", () => {
  const policy = makePolicy();
  const intent = makeIntent();

  const result = evaluatePolicy(intent, policy, "0", NOW);

  assert.equal(result.decision, "PASS");
  assert.ok(result.rules.every((r) => r.passed));
});

test("BLOCK when amount exceeds maxPerTransaction", () => {
  const policy = makePolicy({ maxPerTransaction: "10" });
  const intent = makeIntent({ source: { country: "US", currency: "USD", amount: "50" } });

  const result = evaluatePolicy(intent, policy, "0", NOW);

  assert.equal(result.decision, "BLOCK");
  const rule = result.rules.find((r) => r.rule === "amount.maxPerTransaction");
  assert.equal(rule?.passed, false);
});

test("BLOCK when cumulative daily spend would exceed dailyLimit", () => {
  const policy = makePolicy({ dailyLimit: "60" });
  const intent = makeIntent({ source: { country: "US", currency: "USD", amount: "50" } });

  const result = evaluatePolicy(intent, policy, "40", NOW);

  assert.equal(result.decision, "BLOCK");
  const rule = result.rules.find((r) => r.rule === "amount.dailyLimit");
  assert.equal(rule?.passed, false);
});

test("REQUIRES_APPROVAL when amount exceeds humanApprovalAbove but is otherwise within limits", () => {
  const policy = makePolicy({ humanApprovalAbove: "30" });
  const intent = makeIntent({ source: { country: "US", currency: "USD", amount: "50" } });

  const result = evaluatePolicy(intent, policy, "0", NOW);

  assert.equal(result.decision, "REQUIRES_APPROVAL");
  const rule = result.rules.find((r) => r.rule === "amount.humanApprovalAbove");
  assert.equal(rule?.passed, false);
});

test("BLOCK unconditionally when policy status is not ACTIVE (emergency disable)", () => {
  const policy = makePolicy({ status: "DISABLED" });
  const intent = makeIntent();

  const result = evaluatePolicy(intent, policy, "0", NOW);

  assert.equal(result.decision, "BLOCK");
  const rule = result.rules.find((r) => r.rule === "policy.status.active");
  assert.equal(rule?.passed, false);
});

test("BLOCK when the intent has already expired", () => {
  const policy = makePolicy();
  const intent = makeIntent({ constraints: { expiry: PAST_EXPIRY } });

  const result = evaluatePolicy(intent, policy, "0", NOW);

  assert.equal(result.decision, "BLOCK");
  const rule = result.rules.find((r) => r.rule === "intent.notExpired");
  assert.equal(rule?.passed, false);
});

test("BLOCK when destination is not in allowedDestinations", () => {
  const policy = makePolicy({ allowedDestinations: ["rcp_someone_else"] });
  const intent = makeIntent();

  const result = evaluatePolicy(intent, policy, "0", NOW);

  assert.equal(result.decision, "BLOCK");
  const rule = result.rules.find((r) => r.rule === "destination.allowedDestinations");
  assert.equal(rule?.passed, false);
});

test("BLOCK when asset/currency is not in allowedAssets", () => {
  const policy = makePolicy({ allowedAssets: ["EUR"] });
  const intent = makeIntent();

  const result = evaluatePolicy(intent, policy, "0", NOW);

  assert.equal(result.decision, "BLOCK");
  const rule = result.rules.find((r) => r.rule === "asset.allowedAssets");
  assert.equal(rule?.passed, false);
});
