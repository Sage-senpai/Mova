import { assertTransition, type AuditEvent, type Payment, type PaymentId, type PaymentState } from "@mova/domain";

/**
 * In-memory persistence for the hackathon demo — there is no real database
 * behind this. Everything lives in process memory and is lost on restart.
 * This is a deliberate hackathon simplification (see docs/architecture.md
 * §2 "modular monolith"): the class is written so the same call surface
 * (createPayment/getPayment/transitionPayment/recordAuditEvent/etc.) could
 * be backed by a real store later without changing callers.
 */
export class InMemoryLedger {
  private readonly payments = new Map<PaymentId, Payment>();
  private readonly auditEvents: AuditEvent[] = [];
  private readonly usedNonces = new Set<string>();
  /** Keyed by `${agentId}:${date}` -> cumulative spend so far, as a Number.
   * Real production code would use a decimal library instead of Number
   * accumulation, to avoid floating-point rounding error on money values;
   * this is an accepted shortcut for a hackathon-scale demo. */
  private readonly spendByAgentDay = new Map<string, number>();

  createPayment(payment: Payment): void {
    this.payments.set(payment.id, payment);
  }

  getPayment(id: PaymentId): Payment | undefined {
    return this.payments.get(id);
  }

  /**
   * Transitions a payment to a new state, per the authoritative state
   * machine in packages/domain/src/payments/paymentState.ts. Throws
   * IllegalPaymentTransitionError (via assertTransition) if the transition
   * isn't in the allow-list. Appends a StateTransitionRecord to history
   * and updates `state`/`updatedAt` on success.
   */
  transitionPayment(id: PaymentId, to: PaymentState, reason?: string): Payment {
    const payment = this.payments.get(id);
    if (!payment) {
      throw new Error(`No payment found with id ${id}`);
    }

    assertTransition(payment.state, to);

    const now = new Date().toISOString();
    payment.history.push({ from: payment.state, to, at: now, reason });
    payment.state = to;
    payment.updatedAt = now;

    return payment;
  }

  recordAuditEvent(event: AuditEvent): void {
    this.auditEvents.push(event);
  }

  getAuditEvents(filter?: { intentId?: string; paymentId?: string }): AuditEvent[] {
    if (!filter) {
      return [...this.auditEvents];
    }
    return this.auditEvents.filter((event) => {
      if (filter.intentId !== undefined && event.intentId !== filter.intentId) {
        return false;
      }
      if (filter.paymentId !== undefined && event.paymentId !== filter.paymentId) {
        return false;
      }
      return true;
    });
  }

  /**
   * Replay protection per docs/security.md: a signed intent's (sender,
   * nonce) pair may only be consumed once. Returns false (and records
   * nothing) if that pair was already used; returns true and records it
   * otherwise.
   */
  reserveNonce(sender: string, nonce: string): boolean {
    const key = `${sender}:${nonce}`;
    if (this.usedNonces.has(key)) {
      return false;
    }
    this.usedNonces.add(key);
    return true;
  }

  /**
   * Adds `amount` to the agent's running total for `date` (an ISO date
   * string, e.g. "2026-09-17" — callers are responsible for using a
   * consistent format/timezone so day boundaries line up).
   */
  recordSpend(agentId: string, amount: string, date: string): void {
    const key = `${agentId}:${date}`;
    const current = this.spendByAgentDay.get(key) ?? 0;
    this.spendByAgentDay.set(key, current + Number(amount));
  }

  /** Cumulative spend recorded for this agent on this date, as a string. */
  getSpendToday(agentId: string, date: string): string {
    const key = `${agentId}:${date}`;
    const total = this.spendByAgentDay.get(key) ?? 0;
    return String(total);
  }
}
