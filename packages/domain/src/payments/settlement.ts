import type { SettlementId, PaymentId } from "../ids.js";

export type SettlementCapability = "REAL" | "SANDBOX" | "MOCK" | "SEMI_MANUAL" | "FUTURE";

export type Settlement = {
  id: SettlementId;
  paymentId: PaymentId;

  provider: string;
  capability: SettlementCapability;

  exchangeRate?: string;
  providerRef?: string;

  createdAt: string;
  completedAt?: string;
  failureReason?: string;
};
