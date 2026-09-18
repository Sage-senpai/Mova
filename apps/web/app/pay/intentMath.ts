import { newIntentId, newUserId, newRecipientId, type PaymentIntent, type PaymentRail, type Route } from "@mova/domain";
import { discoverRoutes } from "@mova/routing-engine";
import { NigerianBankRail } from "@mova/payment-rails-bank";
import { P2PRail } from "@mova/payment-rails-p2p";
import { DemoStablecoinRail } from "@mova/payment-rails-stablecoin";

export type DraftIntent = {
  recipientName: string;
  theyReceive: string;
  destinationCurrency: string;
  youCanSpend: string;
  sourceCurrency: string;
  maxFee: string;
  completeWithinMinutes: number;
};

export const DEFAULT_DRAFT: DraftIntent = {
  recipientName: "Carlos Mendoza",
  theyReceive: "2,000",
  destinationCurrency: "Bs",
  youCanSpend: "150,000",
  sourceCurrency: "₦",
  maxFee: "3,000",
  completeWithinMinutes: 10,
};

/** UI display symbols -> ISO-ish currency codes the rail packages' rate tables key on. */
const CURRENCY_CODE: Record<string, string> = {
  "₦": "NGN",
  Bs: "BOB",
};

/**
 * Same illustrative NGN:BOB ratio the mock rails use (see
 * packages/payment-rails/bank/src/index.ts's ILLUSTRATIVE_RATES) — kept in
 * sync here so the create-intent form's live auto-calculation and the
 * routing engine's quotes land in the same ballpark. Not a real FX rate.
 */
const ILLUSTRATIVE_NGN_BOB_RATE = 0.0133;

function parseAmount(value: string): number {
  const n = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(n: number): string {
  return Math.max(0, Math.round(n)).toLocaleString("en-US");
}

/** They-receive (BOB) from you-can-spend (NGN), for the create-intent form's
 * live two-way auto-calculation. Illustrative rate, not a real quote — the
 * real per-rail quote happens later in route discovery. */
export function theyReceiveFromSpend(youCanSpendNgn: string): string {
  return formatAmount(parseAmount(youCanSpendNgn) * ILLUSTRATIVE_NGN_BOB_RATE);
}

/** The inverse of theyReceiveFromSpend, for editing the "they receive" field directly. */
export function spendFromTheyReceive(theyReceiveBob: string): string {
  return formatAmount(parseAmount(theyReceiveBob) / ILLUSTRATIVE_NGN_BOB_RATE);
}

/**
 * A small, real testnet XLM amount to actually send when a Pollar wallet is
 * connected, automatically derived from the NGN amount rather than a fixed
 * constant. Clamped to a demo-safe range (0.5-3 XLM) so this never tries to
 * drain more than a freshly-funded testnet wallet realistically holds.
 */
export function demoNativeSendAmount(youCanSpendNgn: string): string {
  const scaled = parseAmount(youCanSpendNgn) / 75_000;
  return Math.min(3, Math.max(0.5, scaled)).toFixed(2);
}

/**
 * Builds a real PaymentIntent from the create-intent form. Amounts are
 * decimal strings throughout (ADR-005) — the ₦/Bs symbols are display-only
 * and mapped to ISO-ish currency codes for the domain/rail layer.
 */
export function buildIntent(draft: DraftIntent): PaymentIntent {
  const expiry = new Date(Date.now() + draft.completeWithinMinutes * 60_000).toISOString();
  return {
    id: newIntentId(),
    createdAt: new Date().toISOString(),
    sender: { userId: newUserId() },
    recipient: { recipientId: newRecipientId() },
    source: {
      country: "NG",
      currency: CURRENCY_CODE[draft.sourceCurrency] ?? draft.sourceCurrency,
      amount: draft.youCanSpend.replace(/,/g, ""),
    },
    destination: {
      country: "BO",
      currency: CURRENCY_CODE[draft.destinationCurrency] ?? draft.destinationCurrency,
      minimumReceived: draft.theyReceive.replace(/,/g, ""),
    },
    constraints: {
      maxFee: draft.maxFee.replace(/,/g, ""),
      maxDurationSeconds: draft.completeWithinMinutes * 60,
      expiry,
    },
  };
}

/**
 * The three MOCK rail archetypes from docs/african-rails.md, run through
 * the real @mova/routing-engine scoring/exclusion logic — this is not a
 * simplified re-implementation, it's the actual packages other agents on
 * the team built.
 */
function rails(): PaymentRail[] {
  return [new NigerianBankRail(), new P2PRail(), new DemoStablecoinRail()];
}

export async function discoverRealRoutes(intent: PaymentIntent): Promise<Route[]> {
  return discoverRoutes(intent, rails(), "BALANCED");
}

const HOP_DISPLAY_LABEL: Record<string, string> = {
  BANK: "Bank",
  P2P: "P2P",
  STABLECOIN: "Stablecoin",
  MOBILE_MONEY: "Mobile money",
  SETTLEMENT: "Settlement",
  MOVA: "MOVA",
  POLLAR: "Pollar",
};

export function routeLabel(route: Route): string {
  return route.hops
    .map((h) => HOP_DISPLAY_LABEL[h.label] ?? h.label)
    .join(" → ");
}

export function formatEta(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export type PersistedTransaction = {
  intentId: string;
  draft: DraftIntent;
  route: Route;
  createdAt: string;
  completedAt: string;
};

const STORAGE_PREFIX = "mova:tx:";

export function saveTransaction(record: PersistedTransaction) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${record.intentId}`, JSON.stringify(record));
  } catch {
    // sessionStorage can throw in private browsing — non-fatal for this demo view.
  }
}

export function loadTransaction(intentId: string): PersistedTransaction | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${intentId}`);
    return raw ? (JSON.parse(raw) as PersistedTransaction) : null;
  } catch {
    return null;
  }
}
