import type { PaymentIntent } from "../intents/paymentIntent.js";
import type { Quote } from "./quote.js";

export type RailKind = "BANK" | "P2P" | "MOBILE_MONEY" | "STABLECOIN" | "SETTLEMENT";

export type TransferStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type Transfer = {
  id: string;
  railId: string;
  intentId: PaymentIntent["id"];
  quoteId: Quote["id"];
  status: TransferStatus;
  createdAt: string;
  updatedAt: string;
  providerRef?: string;
  failureReason?: string;
};

/**
 * Port every funding/settlement rail implements. MOVA never talks to a
 * provider directly outside an adapter that satisfies this interface —
 * see docs/architecture.md §provider adapter boundary.
 */
export interface PaymentRail {
  readonly id: string;
  readonly kind: RailKind;
  /** REAL | SANDBOX | MOCK | SEMI_MANUAL | FUTURE — see docs/pollar-integration.md and docs/african-rails.md */
  readonly capability: "REAL" | "SANDBOX" | "MOCK" | "SEMI_MANUAL" | "FUTURE";

  getQuote(intent: PaymentIntent): Promise<Quote>;
  createTransfer(intent: PaymentIntent, quote: Quote): Promise<Transfer>;
  getStatus(id: string): Promise<TransferStatus>;
  cancel?(id: string): Promise<void>;
}
