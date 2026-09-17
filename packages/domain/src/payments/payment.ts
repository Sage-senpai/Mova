import type { PaymentId, IntentId, QuoteId, RouteId, SettlementId } from "../ids.js";
import type { PaymentState } from "./paymentState.js";

export type StateTransitionRecord = {
  from: PaymentState | null;
  to: PaymentState;
  at: string;
  reason?: string;
};

export type Payment = {
  id: PaymentId;
  intentId: IntentId;
  quoteId: QuoteId;
  routeId: RouteId;
  settlementId?: SettlementId;

  state: PaymentState;
  history: StateTransitionRecord[];

  sourceAmount: string;
  destinationAmount: string;
  fee: string;

  createdAt: string;
  updatedAt: string;
};
