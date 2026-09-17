import type { QuoteId, IntentId, RouteId } from "../ids.js";

export type Quote = {
  id: QuoteId;
  intentId: IntentId;

  sourceAmount: string;
  destinationAmount: string;

  fee: string;
  rate?: string;

  estimatedDurationSeconds: number;

  routeId: RouteId;

  createdAt: string;
  expiresAt: string;

  provider: string;

  metadata?: Record<string, unknown>;
};

export function isQuoteExpired(quote: Quote, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(quote.expiresAt).getTime();
}
