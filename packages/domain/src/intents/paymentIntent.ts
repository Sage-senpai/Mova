import type { IntentId, PolicyId, UserId, RecipientId, AgentId } from "../ids.js";

/**
 * What the sender wants to happen — never how it happens. The router
 * (packages/routing-engine) turns this into candidate Routes; the
 * policy engine (packages/policy-engine) decides whether it's allowed.
 */
export type PaymentIntent = {
  id: IntentId;
  createdAt: string;

  sender: {
    userId: UserId;
    /** Present only for machine-generated intents. See docs/security.md §agent safety model. */
    agentId?: AgentId;
  };
  recipient: {
    recipientId: RecipientId;
  };

  source: {
    country: string;
    currency: string;
    amount: string;
  };

  destination: {
    country: string;
    currency: string;
    minimumReceived?: string;
  };

  constraints: {
    maxFee?: string;
    maxDurationSeconds?: number;
    maxSlippageBps?: number;
    expiry: string;
  };

  allowedRails?: string[];
  /** Policy this intent was evaluated against, if any (required for agent-originated intents). */
  policyId?: PolicyId;

  /** Prevents replay of a signed intent. Required when signature is present. */
  nonce?: string;
  signature?: string;
};

export function isExpired(intent: PaymentIntent, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(intent.constraints.expiry).getTime();
}
