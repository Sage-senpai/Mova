import { newIntentId } from "@mova/domain";
import type { Agent, PaymentIntent, RecipientId } from "@mova/domain";
import type { X402PaymentRequirements } from "./types.js";

/**
 * x402 payment windows are short-lived, single-shot requests (unlike a
 * standing PaymentIntent), so absent a `maxTimeoutSeconds` on the
 * requirements this defaults to a short expiry.
 */
const DEFAULT_EXPIRY_SECONDS = 60;

export type IntentFromX402Options = {
  /** Country the paying funds originate from. Agent has no home-country field in the fixed domain contract, so this defaults to destinationCountry as a hackathon simplification — a real flow would source this from the owning user's profile. */
  sourceCountry?: string;
  /** Currency the payer is debited in. x402 requests are typically single-asset (pay the exact `asset` to `payTo`, no FX leg inside the x402 hop itself), so this defaults to `requirements.asset`. */
  sourceCurrency?: string;
  /**
   * MOVA's `PaymentIntent.recipient.recipientId` is a resolved domain
   * `RecipientId`, but x402 only gives us a raw `payTo` address — recipient
   * resolution (address -> Recipient record) is out of scope for this
   * bridge package. When omitted, `payTo` is cast through directly; see
   * packages/policy-engine/src/evaluate.ts, which already treats
   * `recipient.recipientId` as an opaque string for its allow-list check,
   * so this is consistent with how policy evaluation actually reads it.
   */
  recipientId?: RecipientId;
  /** Overrides the computed expiry window, in seconds. */
  expirySeconds?: number;
  now?: Date;
};

/**
 * Maps an incoming x402 payment requirement into a properly-shaped
 * `PaymentIntent`. This only builds the intent — per docs/security.md, the
 * intent MUST be evaluated by the policy engine before any quote is
 * requested or execution proceeds; that happens in handleX402Payment.ts,
 * not here.
 */
export function intentFromX402(
  requirements: X402PaymentRequirements,
  agent: Agent,
  destinationCountry: string,
  options: IntentFromX402Options = {},
): PaymentIntent {
  const now = options.now ?? new Date();
  const expirySeconds =
    options.expirySeconds ?? requirements.maxTimeoutSeconds ?? DEFAULT_EXPIRY_SECONDS;
  const expiry = new Date(now.getTime() + expirySeconds * 1000).toISOString();

  return {
    id: newIntentId(),
    createdAt: now.toISOString(),
    sender: {
      userId: agent.ownerId,
      agentId: agent.id,
    },
    recipient: {
      recipientId: options.recipientId ?? (requirements.payTo as RecipientId),
    },
    source: {
      country: options.sourceCountry ?? destinationCountry,
      currency: options.sourceCurrency ?? requirements.asset,
      amount: requirements.amount,
    },
    destination: {
      country: destinationCountry,
      currency: requirements.asset,
    },
    constraints: {
      maxDurationSeconds: expirySeconds,
      expiry,
    },
  };
}
