/**
 * The single authoritative payment lifecycle. No UI or adapter may
 * invent a state outside this list — see docs/architecture.md
 * §payment state machine and the red-team question "can the UI say
 * 'complete' while settlement is pending?" in docs/agents/redteam.md.
 */
export type PaymentState =
  | "CREATED"
  | "QUOTED"
  | "AUTHORIZED"
  | "FUNDING"
  | "FUNDED"
  | "SETTLING"
  | "DESTINATION_PENDING"
  | "COMPLETED"
  | "QUOTE_EXPIRED"
  | "FUNDING_FAILED"
  | "ROUTE_UNAVAILABLE"
  | "SETTLEMENT_FAILED"
  | "DESTINATION_FAILED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED";

export const TERMINAL_STATES: ReadonlySet<PaymentState> = new Set([
  "COMPLETED",
  "QUOTE_EXPIRED",
  "ROUTE_UNAVAILABLE",
  "CANCELLED",
  "REFUNDED",
]);

/**
 * Explicit allow-list of transitions. A transition not listed here is
 * illegal, full stop — this is what makes the state machine authoritative
 * rather than advisory.
 */
const TRANSITIONS: Record<PaymentState, PaymentState[]> = {
  CREATED: ["QUOTED", "ROUTE_UNAVAILABLE", "CANCELLED"],
  QUOTED: ["AUTHORIZED", "QUOTE_EXPIRED", "CANCELLED"],
  AUTHORIZED: ["FUNDING", "CANCELLED"],
  FUNDING: ["FUNDED", "FUNDING_FAILED", "CANCELLED"],
  FUNDED: ["SETTLING"],
  SETTLING: ["DESTINATION_PENDING", "SETTLEMENT_FAILED"],
  DESTINATION_PENDING: ["COMPLETED", "DESTINATION_FAILED"],
  COMPLETED: [],
  QUOTE_EXPIRED: [],
  FUNDING_FAILED: ["REFUND_PENDING", "CANCELLED"],
  ROUTE_UNAVAILABLE: [],
  SETTLEMENT_FAILED: ["REFUND_PENDING"],
  DESTINATION_FAILED: ["REFUND_PENDING"],
  CANCELLED: [],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: [],
};

export class IllegalPaymentTransitionError extends Error {
  constructor(from: PaymentState, to: PaymentState) {
    super(`Illegal payment transition: ${from} -> ${to}`);
    this.name = "IllegalPaymentTransitionError";
  }
}

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: PaymentState, to: PaymentState): void {
  if (!canTransition(from, to)) {
    throw new IllegalPaymentTransitionError(from, to);
  }
}

export function isTerminal(state: PaymentState): boolean {
  return TERMINAL_STATES.has(state);
}
