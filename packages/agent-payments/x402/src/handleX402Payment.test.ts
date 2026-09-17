import test from "node:test";
import assert from "node:assert/strict";
import {
  newAgentId,
  newPolicyId,
  newUserId,
  type Agent,
  type AgentPolicy,
  type PolicyCheckResult,
} from "@mova/domain";
import { handleX402Payment } from "./handleX402Payment.js";
import type { ExecuteIntent, PolicyEvaluator, X402PaymentRequirements } from "./types.js";

const NOW = new Date("2026-09-17T12:00:00.000Z");

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: newAgentId(),
    name: "test-agent",
    ownerId: newUserId(),
    status: "ACTIVE",
    ...overrides,
  };
}

function makePolicy(overrides: Partial<AgentPolicy> = {}): AgentPolicy {
  return {
    id: newPolicyId(),
    agentId: newAgentId(),
    maxPerTransaction: "100",
    dailyLimit: "500",
    currency: "USD",
    allowedDestinations: ["0xRecipient"],
    allowedAssets: ["USDC"],
    status: "ACTIVE",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function makeRequirements(overrides: Partial<X402PaymentRequirements> = {}): X402PaymentRequirements {
  return {
    scheme: "exact",
    network: "eip155:84532",
    amount: "10",
    asset: "USDC",
    payTo: "0xRecipient",
    resource: "https://api.example.com/premium-data",
    description: "Access to premium market data",
    ...overrides,
  };
}

function passResult(policyId: AgentPolicy["id"]): PolicyCheckResult {
  return {
    policyId,
    decision: "PASS",
    rules: [{ rule: "amount.maxPerTransaction", passed: true }],
    evaluatedAt: NOW.toISOString(),
  };
}

function blockResult(policyId: AgentPolicy["id"]): PolicyCheckResult {
  return {
    policyId,
    decision: "BLOCK",
    rules: [
      { rule: "amount.maxPerTransaction", passed: false, detail: "Amount 10 exceeds maxPerTransaction 1." },
      { rule: "intent.notExpired", passed: true },
    ],
    evaluatedAt: NOW.toISOString(),
  };
}

function requiresApprovalResult(policyId: AgentPolicy["id"]): PolicyCheckResult {
  return {
    policyId,
    decision: "REQUIRES_APPROVAL",
    rules: [
      { rule: "amount.humanApprovalAbove", passed: false, detail: "Amount 10 exceeds humanApprovalAbove 5." },
    ],
    evaluatedAt: NOW.toISOString(),
  };
}

function neverExecute(): ExecuteIntent {
  return async () => {
    throw new Error("executeIntent must not be called for this decision");
  };
}

test("BLOCK produces a rejection response referencing the failed rule", async () => {
  const agent = makeAgent();
  const policy = makePolicy();
  const evaluatePolicy: PolicyEvaluator = () => blockResult(policy.id);

  const response = await handleX402Payment({
    requirements: makeRequirements(),
    agent,
    policy,
    destinationCountry: "US",
    evaluatePolicy,
    executeIntent: neverExecute(),
    now: NOW,
  });

  if (response.kind !== "REJECTED") return assert.fail(`expected REJECTED, got ${response.kind}`);
  assert.equal(response.status, 403);
  assert.equal(response.body.decision, "BLOCK");
  assert.match(response.body.reason, /amount\.maxPerTransaction/);
  assert.equal(response.body.failedRules.length, 1);
  assert.equal(response.body.failedRules[0]?.rule, "amount.maxPerTransaction");
});

test("REQUIRES_APPROVAL never calls executeIntent and returns a distinct pending response", async () => {
  const agent = makeAgent();
  const policy = makePolicy();
  const evaluatePolicy: PolicyEvaluator = () => requiresApprovalResult(policy.id);

  const response = await handleX402Payment({
    requirements: makeRequirements(),
    agent,
    policy,
    destinationCountry: "US",
    evaluatePolicy,
    executeIntent: neverExecute(),
    now: NOW,
  });

  if (response.kind !== "PENDING_APPROVAL")
    return assert.fail(`expected PENDING_APPROVAL, got ${response.kind}`);
  assert.equal(response.status, 202);
  assert.notEqual(response.status, 200);
  assert.equal(response.body.decision, "REQUIRES_APPROVAL");
});

test("PASS calls executeIntent and returns a success response with the settlement ref", async () => {
  const agent = makeAgent();
  const policy = makePolicy();
  const evaluatePolicy: PolicyEvaluator = () => passResult(policy.id);
  let called = false;
  const executeIntent: ExecuteIntent = async (intent) => {
    called = true;
    assert.equal(intent.policyId, policy.id);
    return { success: true, ref: "settlement-ref-123" };
  };

  const response = await handleX402Payment({
    requirements: makeRequirements(),
    agent,
    policy,
    destinationCountry: "US",
    evaluatePolicy,
    executeIntent,
    now: NOW,
  });

  assert.ok(called, "executeIntent should be called on PASS");
  if (response.kind !== "SETTLED") return assert.fail(`expected SETTLED, got ${response.kind}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.decision, "PASS");
  assert.equal(response.body.ref, "settlement-ref-123");
});

test("executeIntent failure is surfaced, not silently reported as success", async () => {
  const agent = makeAgent();
  const policy = makePolicy();
  const evaluatePolicy: PolicyEvaluator = () => passResult(policy.id);
  const executeIntent: ExecuteIntent = async () => ({ success: false });

  const response = await handleX402Payment({
    requirements: makeRequirements(),
    agent,
    policy,
    destinationCountry: "US",
    evaluatePolicy,
    executeIntent,
    now: NOW,
  });

  assert.notEqual(response.kind, "SETTLED");
  if (response.kind !== "EXECUTION_FAILED")
    return assert.fail(`expected EXECUTION_FAILED, got ${response.kind}`);
  assert.equal(response.body.decision, "PASS");
});

test("agent that is not ACTIVE is rejected before policy evaluation or execution", async () => {
  const agent = makeAgent({ status: "DISABLED" });
  const policy = makePolicy();
  const evaluatePolicy: PolicyEvaluator = () => {
    throw new Error("evaluatePolicy must not be called when the agent is not ACTIVE");
  };

  const response = await handleX402Payment({
    requirements: makeRequirements(),
    agent,
    policy,
    destinationCountry: "US",
    evaluatePolicy,
    executeIntent: neverExecute(),
    now: NOW,
  });

  assert.equal(response.kind, "REJECTED");
  assert.equal(response.status, 403);
});
