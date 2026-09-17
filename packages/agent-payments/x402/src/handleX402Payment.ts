import type { Agent, AgentPolicy, PaymentIntent } from "@mova/domain";
import { intentFromX402 } from "./intentFromX402.js";
import type {
  ExecuteIntent,
  PolicyEvaluator,
  X402PaymentRequirements,
  X402Response,
} from "./types.js";

export type HandleX402PaymentInput = {
  requirements: X402PaymentRequirements;
  agent: Agent;
  policy: AgentPolicy;
  /** Country the payment is settling to; forwarded into the built intent. */
  destinationCountry: string;
  /** Injected policy evaluator — see PolicyEvaluator in types.ts for why this isn't a direct @mova/policy-engine import. */
  evaluatePolicy: PolicyEvaluator;
  /** Injected execution hook (routing + settlement) — only called on PASS. */
  executeIntent: ExecuteIntent;
  now?: Date;
};

/**
 * Orchestrates one x402-triggered payment attempt end to end:
 *
 *   incoming 402-style request -> build PaymentIntent -> policy check -> execute (only on PASS)
 *
 * Per docs/security.md's agent safety model, the policy check MUST happen
 * before anything else — this function never requests a quote or calls
 * executeIntent before evaluatePolicy has run. `BLOCK` and
 * `REQUIRES_APPROVAL` each produce a distinct, clearly-labeled response and
 * never fall through to execution.
 */
export async function handleX402Payment(
  input: HandleX402PaymentInput,
): Promise<X402Response> {
  const { requirements, agent, policy, destinationCountry, evaluatePolicy, executeIntent, now } =
    input;

  // Emergency disable (docs/security.md "Emergency disable"): Agent.status
  // is checked before policy evaluation, independent of policy limits.
  if (agent.status !== "ACTIVE") {
    return {
      kind: "REJECTED",
      status: 403,
      headers: {},
      body: {
        decision: "BLOCK",
        reason: `Agent ${agent.id} status is ${agent.status}, not ACTIVE; no intent was evaluated or executed.`,
        failedRules: [],
      },
    };
  }

  const baseIntent = intentFromX402(requirements, agent, destinationCountry, { now });
  const intent: PaymentIntent = { ...baseIntent, policyId: policy.id };

  // Policy check happens before any quote request or execution — never skip
  // or reorder this.
  const result = await evaluatePolicy(intent, policy);

  if (result.decision === "BLOCK") {
    const failedRules = result.rules.filter((rule) => !rule.passed);
    const reason =
      failedRules
        .map((rule) => (rule.detail ? `${rule.rule}: ${rule.detail}` : rule.rule))
        .join("; ") || "Policy check failed.";

    return {
      kind: "REJECTED",
      status: 403,
      headers: {},
      body: { decision: "BLOCK", reason, failedRules },
    };
  }

  if (result.decision === "REQUIRES_APPROVAL") {
    // Distinct pending state — not a 200, not a silent pass, and
    // executeIntent is never called for this decision.
    return {
      kind: "PENDING_APPROVAL",
      status: 202,
      headers: {},
      body: {
        decision: "REQUIRES_APPROVAL",
        intentId: intent.id,
        reason:
          "This payment exceeds the agent's human-approval threshold and requires explicit human approval before it can execute.",
        rules: result.rules,
      },
    };
  }

  // result.decision === "PASS" — only now may execution proceed.
  const execution = await executeIntent(intent);

  if (!execution.success) {
    return {
      kind: "EXECUTION_FAILED",
      status: 402,
      headers: {},
      body: {
        decision: "PASS",
        intentId: intent.id,
        reason: "Policy check passed but execution did not succeed.",
      },
    };
  }

  return {
    kind: "SETTLED",
    status: 200,
    headers: {},
    body: {
      decision: "PASS",
      intentId: intent.id,
      ref: execution.ref,
    },
  };
}
