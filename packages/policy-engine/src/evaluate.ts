import {
  isExpired,
  type AgentPolicy,
  type PaymentIntent,
  type PolicyCheckResult,
  type PolicyRuleResult,
} from "@mova/domain";

/**
 * Parses a decimal-amount string to a Number for comparison purposes only.
 *
 * Real production code would use a decimal library (e.g. decimal.js or
 * big.js) here to avoid floating-point rounding error on money values.
 * For this hackathon demo the amounts are small, human-entered figures,
 * so `Number` parsing is an accepted shortcut for comparisons — it is
 * never used to compute a value that gets persisted or moved.
 */
function toNumber(amount: string): number {
  return Number(amount);
}

/** Rule name for the human-approval-threshold check, singled out below
 * because — unlike every other rule — failing it does not BLOCK, it
 * downgrades the decision to REQUIRES_APPROVAL. */
const HUMAN_APPROVAL_RULE = "amount.humanApprovalAbove";

/**
 * Evaluates a PaymentIntent against an AgentPolicy, per the "Agent safety
 * model" in docs/security.md. This runs BEFORE any Quote is requested —
 * see the pipeline diagram there (Agent request -> AgentPolicy ->
 * PolicyEngine.evaluate() -> PaymentIntent).
 *
 * `cumulativeSpendToday` is the agent's spend so far today (from the
 * ledger's per-agent/per-day tracker), NOT including this intent's amount.
 */
export function evaluatePolicy(
  intent: PaymentIntent,
  policy: AgentPolicy,
  cumulativeSpendToday: string,
  now: Date = new Date(),
): PolicyCheckResult {
  const rules: PolicyRuleResult[] = [];

  // --- Emergency disable (docs/security.md "Emergency disable") ---------
  // Checked before every other rule: flipping Agent.status to PAUSED or
  // DISABLED blocks every future intent immediately, independent of
  // whether the intent itself would otherwise be fine.
  rules.push({
    rule: "policy.status.active",
    passed: policy.status === "ACTIVE",
    detail:
      policy.status === "ACTIVE"
        ? undefined
        : `Policy status is ${policy.status}; agent payments are disabled.`,
  });

  // --- Expiry -------------------------------------------------------------
  const expired = isExpired(intent, now);
  rules.push({
    rule: "intent.notExpired",
    passed: !expired,
    detail: expired
      ? `Intent expired at ${intent.constraints.expiry}; now is ${now.toISOString()}.`
      : undefined,
  });

  // --- Per-transaction cap --------------------------------------------------
  const amount = toNumber(intent.source.amount);
  const maxPerTransaction = toNumber(policy.maxPerTransaction);
  const withinMaxPerTransaction = amount <= maxPerTransaction;
  rules.push({
    rule: "amount.maxPerTransaction",
    passed: withinMaxPerTransaction,
    detail: withinMaxPerTransaction
      ? undefined
      : `Amount ${intent.source.amount} exceeds maxPerTransaction ${policy.maxPerTransaction}.`,
  });

  // --- Cumulative daily limit ----------------------------------------------
  const spendToday = toNumber(cumulativeSpendToday);
  const dailyLimit = toNumber(policy.dailyLimit);
  const projectedSpend = spendToday + amount;
  const withinDailyLimit = projectedSpend <= dailyLimit;
  rules.push({
    rule: "amount.dailyLimit",
    passed: withinDailyLimit,
    detail: withinDailyLimit
      ? undefined
      : `Cumulative spend today (${cumulativeSpendToday}) + amount (${intent.source.amount}) = ${projectedSpend}, exceeds dailyLimit ${policy.dailyLimit}.`,
  });

  // --- Destination allow-list -----------------------------------------------
  // The domain model doesn't have a single canonical "destination"
  // identifier distinct from the recipient, so we treat the recipient's
  // id as the destination being checked against `allowedDestinations`
  // (an agent may only be allowed to pay a fixed, pre-approved set of
  // recipients — see docs/security.md's "fake recipient" red-team note).
  const destinationId = intent.recipient.recipientId as string;
  const destinationAllowed = policy.allowedDestinations.includes(destinationId);
  rules.push({
    rule: "destination.allowedDestinations",
    passed: destinationAllowed,
    detail: destinationAllowed
      ? undefined
      : `Recipient ${destinationId} is not in allowedDestinations.`,
  });

  // --- Asset allow-list -------------------------------------------------
  // "Asset" is interpreted as the currency/token moving on either leg of
  // the payment; both source and destination currencies must be allowed.
  const disallowedAssets = [intent.source.currency, intent.destination.currency].filter(
    (currency) => !policy.allowedAssets.includes(currency),
  );
  const assetsAllowed = disallowedAssets.length === 0;
  rules.push({
    rule: "asset.allowedAssets",
    passed: assetsAllowed,
    detail: assetsAllowed
      ? undefined
      : `Currency/asset(s) ${disallowedAssets.join(", ")} not in allowedAssets.`,
  });

  // --- Fee ceiling (deferred until a Quote exists) ----------------------
  // The actual fee isn't known until routing-engine returns a Quote; this
  // pre-quote check can only confirm the intent *declares* a maxFee
  // constraint to be enforced later (both here, again, once the fee is
  // known, and by Route.satisfiesConstraints per docs/security.md).
  rules.push({
    rule: "fee.maxFee",
    passed: true,
    detail:
      intent.constraints.maxFee === undefined
        ? "No maxFee constraint declared on this intent."
        : `Deferred: fee not yet known pre-quote; will be re-checked against maxFee (${intent.constraints.maxFee}) once a Quote exists.`,
  });

  // --- Slippage ceiling ---------------------------------------------------
  // The realized slippage is only known post-quote, but we can already
  // check that the intent isn't requesting a looser tolerance than the
  // policy allows.
  let slippagePassed = true;
  let slippageDetail: string | undefined;
  if (policy.maxSlippageBps !== undefined) {
    if (intent.constraints.maxSlippageBps !== undefined) {
      slippagePassed = intent.constraints.maxSlippageBps <= policy.maxSlippageBps;
      if (!slippagePassed) {
        slippageDetail = `Intent's requested maxSlippageBps (${intent.constraints.maxSlippageBps}) exceeds policy's maxSlippageBps (${policy.maxSlippageBps}).`;
      } else {
        slippageDetail = `Deferred: realized slippage not yet known pre-quote; will be re-checked against maxSlippageBps (${policy.maxSlippageBps}) once a Quote exists.`;
      }
    } else {
      slippageDetail = `Deferred: realized slippage not yet known pre-quote; will be re-checked against maxSlippageBps (${policy.maxSlippageBps}) once a Quote exists.`;
    }
  } else {
    slippageDetail = "Policy sets no maxSlippageBps limit.";
  }
  rules.push({
    rule: "slippage.maxSlippageBps",
    passed: slippagePassed,
    detail: slippageDetail,
  });

  // --- Human-approval threshold --------------------------------------------
  // Not a BLOCK condition on its own: exceeding it downgrades an
  // otherwise-PASSing decision to REQUIRES_APPROVAL (see decision logic
  // below). It is still recorded as a rule so the audit trail shows why.
  let approvalPassed = true;
  let approvalDetail: string | undefined;
  if (policy.humanApprovalAbove !== undefined) {
    const humanApprovalAbove = toNumber(policy.humanApprovalAbove);
    approvalPassed = amount <= humanApprovalAbove;
    if (!approvalPassed) {
      approvalDetail = `Amount ${intent.source.amount} exceeds humanApprovalAbove (${policy.humanApprovalAbove}); requires human approval.`;
    }
  } else {
    approvalDetail = "Policy sets no humanApprovalAbove threshold.";
  }
  rules.push({
    rule: HUMAN_APPROVAL_RULE,
    passed: approvalPassed,
    detail: approvalDetail,
  });

  // --- Decision -------------------------------------------------------------
  // Any BLOCKing rule failure (i.e. any failed rule other than the
  // human-approval threshold) forces BLOCK. Otherwise, exceeding the
  // human-approval threshold downgrades PASS to REQUIRES_APPROVAL.
  const hasBlockingFailure = rules.some(
    (r) => !r.passed && r.rule !== HUMAN_APPROVAL_RULE,
  );

  let decision: PolicyCheckResult["decision"];
  if (hasBlockingFailure) {
    decision = "BLOCK";
  } else if (!approvalPassed) {
    decision = "REQUIRES_APPROVAL";
  } else {
    decision = "PASS";
  }

  return {
    policyId: policy.id,
    decision,
    rules,
    evaluatedAt: now.toISOString(),
  };
}
