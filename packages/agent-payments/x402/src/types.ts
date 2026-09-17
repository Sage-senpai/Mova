import type {
  AgentPolicy,
  PaymentIntent,
  PolicyCheckResult,
  PolicyRuleResult,
} from "@mova/domain";

/**
 * Payment requirements for a protected resource, shaped after the x402
 * protocol's `PaymentRequirements` object.
 *
 * Field names verified live on 2026-09-17 against
 * github.com/coinbase/x402 `specs/x402-specification-v2.md` §5.1 and
 * `specs/transports-v2/http.md` (protocol version 2) via the GitHub
 * contents API — see the header-name note in build402Response.ts and
 * docs/decisions.md ADR-007.
 */
export type X402PaymentRequirements = {
  /** Payment scheme, e.g. "exact". */
  scheme: string;
  /** Network identifier the payment settles on, e.g. a CAIP-2 chain id ("eip155:84532"). */
  network: string;
  /** Amount required. MOVA amounts are always decimal strings (see domain ADR-005), never floats. */
  amount: string;
  /** Asset identifier required for payment (token contract address or symbol). */
  asset: string;
  /** Address/account the payment must be sent to. */
  payTo: string;
  /** The resource being purchased (URL or opaque identifier). */
  resource: string;
  /** Human-readable description of the resource, surfaced to the payer. */
  description?: string;
  /** Max seconds this requirement / settlement is valid for. */
  maxTimeoutSeconds?: number;
  /** Scheme/network-specific extra data (e.g. token name/version for EIP-712 signing). */
  extra?: Record<string, unknown>;
};

/**
 * An incoming request that looks like an x402 flow: a call against a
 * resource that requires payment, optionally already carrying a payment
 * payload (the decoded `PAYMENT-SIGNATURE` header) if this is the
 * client's second attempt after receiving a 402.
 *
 * This package never verifies or settles `paymentSignature` itself — that
 * is a facilitator/routing-engine concern. It exists here only so
 * `handleX402Payment` has somewhere to receive it before handing off.
 */
export type X402Request = {
  requirements: X402PaymentRequirements;
  paymentSignature?: unknown;
};

/** Shape returned when a resource requires payment (HTTP 402 challenge). */
export type X402PaymentRequiredResponse = {
  kind: "PAYMENT_REQUIRED";
  status: 402;
  headers: Record<string, string>;
  body: unknown;
};

/** Distinct, clearly-labeled rejection — policy decision was BLOCK. Never a silent pass. */
export type X402RejectedResponse = {
  kind: "REJECTED";
  status: 403;
  headers: Record<string, string>;
  body: {
    decision: "BLOCK";
    reason: string;
    failedRules: PolicyRuleResult[];
  };
};

/** Distinct, clearly-labeled pending state — policy decision was REQUIRES_APPROVAL. Never a 200, never silent. */
export type X402PendingApprovalResponse = {
  kind: "PENDING_APPROVAL";
  status: 202;
  headers: Record<string, string>;
  body: {
    decision: "REQUIRES_APPROVAL";
    intentId: string;
    reason: string;
    rules: PolicyRuleResult[];
  };
};

/** Policy PASSed and executeIntent reported success. */
export type X402SettledResponse = {
  kind: "SETTLED";
  status: 200;
  headers: Record<string, string>;
  body: {
    decision: "PASS";
    intentId: string;
    ref?: string;
  };
};

/** Policy PASSed but executeIntent reported failure — surfaced, never swallowed as success. */
export type X402ExecutionFailedResponse = {
  kind: "EXECUTION_FAILED";
  status: 402;
  headers: Record<string, string>;
  body: {
    decision: "PASS";
    intentId: string;
    reason: string;
  };
};

export type X402Response =
  | X402PaymentRequiredResponse
  | X402RejectedResponse
  | X402PendingApprovalResponse
  | X402SettledResponse
  | X402ExecutionFailedResponse;

/**
 * Local interface for what this package needs from `packages/policy-engine`.
 *
 * We intentionally do NOT import `@mova/policy-engine` here — it is being
 * built in parallel and may not be finished. `evaluatePolicy` is injected
 * by the caller instead, which keeps this package testable in isolation.
 *
 * Note: the real `policy-engine`'s `evaluatePolicy` also takes
 * `cumulativeSpendToday` and `now` (see packages/policy-engine/src/evaluate.ts).
 * A caller wiring the real engine in should partially apply those before
 * passing the function in as a `PolicyEvaluator`. Returning a `Promise` is
 * also allowed so a real (possibly async) implementation fits without a
 * wrapper.
 */
export type PolicyEvaluator = (
  intent: PaymentIntent,
  policy: AgentPolicy,
) => PolicyCheckResult | Promise<PolicyCheckResult>;

/**
 * Local interface for what this package needs from the routing/execution
 * side (`packages/routing-engine` + settlement). Injected by the caller for
 * the same reason as `PolicyEvaluator` above.
 */
export type ExecuteIntent = (
  intent: PaymentIntent,
) => Promise<{ success: boolean; ref?: string }>;
