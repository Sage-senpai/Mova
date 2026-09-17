import type { AuditEventId, IntentId, PaymentId } from "../ids.js";

/**
 * The event vocabulary is fixed — see docs/architecture.md §observability.
 * A completed payment must be able to reconstruct, from these events alone:
 * what the user asked for -> what MOVA chose -> why -> what happened.
 */
export type AuditEventType =
  | "intent.created"
  | "quote.created"
  | "quote.expired"
  | "policy.checked"
  | "policy.failed"
  | "route.selected"
  | "payment.authorized"
  | "funding.started"
  | "funding.completed"
  | "settlement.started"
  | "settlement.completed"
  | "settlement.failed"
  | "payment.completed"
  | "payment.refunded";

export type AuditEvent = {
  id: AuditEventId;
  type: AuditEventType;
  intentId?: IntentId;
  paymentId?: PaymentId;
  at: string;
  detail?: Record<string, unknown>;
};
