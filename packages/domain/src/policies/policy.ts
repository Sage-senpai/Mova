import type { PolicyId, AgentId } from "../ids.js";

/**
 * What an agent (or a user's standing preferences) is allowed to do.
 * Evaluated by packages/policy-engine before any route is authorized —
 * see docs/security.md §agent safety model.
 */
export type AgentPolicy = {
  id: PolicyId;
  agentId: AgentId;

  maxPerTransaction: string;
  dailyLimit: string;
  currency: string;

  allowedDestinations: string[];
  allowedAssets: string[];
  allowedRails?: string[];

  humanApprovalAbove?: string;
  maxSlippageBps?: number;

  status: "ACTIVE" | "PAUSED" | "DISABLED";
  createdAt: string;
  updatedAt: string;
};

export type PolicyRuleResult = {
  rule: string;
  passed: boolean;
  detail?: string;
};

export type PolicyCheckResult = {
  policyId: PolicyId;
  decision: "PASS" | "BLOCK" | "REQUIRES_APPROVAL";
  rules: PolicyRuleResult[];
  evaluatedAt: string;
};
