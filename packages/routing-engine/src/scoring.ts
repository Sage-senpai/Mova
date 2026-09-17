import type {
  PaymentIntent,
  PaymentRail,
  Quote,
  RankingStrategy,
  RouteScoreBreakdown,
} from "@mova/domain";
import { decimalRatio } from "./decimal.js";

/**
 * Six sub-scores, each normalized roughly 0-100, summed per
 * docs/architecture.md §6 "Routing engine":
 *
 *   score = feeScore + durationScore + liquidityScore
 *         + reliabilityScore + constraintFitScore
 *         + destinationAvailabilityScore
 *
 * (each sub-score is multiplied by its strategy weight below before the
 * sum — see WEIGHTS.)
 */

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Fee relative to the amount being sent. Lower is better: a 1% fee
 * scores ~90, a 5% fee scores ~50, fees at/above 10% bottom out at 0.
 * This is a scoring heuristic, not money accounting, so converting the
 * decimal-safe ratio to a plain Number here is fine (ADR-005).
 */
export function feeScore(intent: PaymentIntent, quote: Quote): number {
  const ratio = decimalRatio(quote.fee, intent.source.amount); // e.g. 0.01 == 1%
  return clamp(100 - ratio * 1000);
}

/**
 * Duration relative to the intent's own maxDurationSeconds if the sender
 * specified one, else a generous default ceiling (48h) used purely as a
 * scoring reference point, not a real SLA commitment.
 */
const DEFAULT_DURATION_CEILING_SECONDS = 48 * 60 * 60;

export function durationScore(intent: PaymentIntent, quote: Quote): number {
  const ceiling = intent.constraints.maxDurationSeconds ?? DEFAULT_DURATION_CEILING_SECONDS;
  if (ceiling <= 0) return 0;
  return clamp(100 * (1 - quote.estimatedDurationSeconds / ceiling));
}

/**
 * HEURISTIC PLACEHOLDER: real liquidity depth isn't available from any
 * rail adapter in this hackathon build. If a rail's Quote.metadata
 * carries a numeric `liquidityScore` (0-100) we treat that as a real
 * signal from the rail; otherwise we use a neutral round number (70)
 * rather than fabricate precision we don't have (docs/security.md
 * "never fabricate").
 */
export function liquidityScore(quote: Quote): number {
  const raw = quote.metadata?.["liquidityScore"];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return clamp(raw);
  }
  return 70;
}

/**
 * Derived from PaymentRail.capability (REAL/SANDBOX/MOCK/SEMI_MANUAL/
 * FUTURE — ADR-004), the one honesty signal every rail is required to
 * declare. This is a heuristic mapping from that label to a score, not a
 * measured uptime/success-rate figure.
 */
export function reliabilityScore(rail: PaymentRail): number {
  switch (rail.capability) {
    case "REAL":
      return 95;
    case "SANDBOX":
      return 80;
    case "MOCK":
      return 60;
    case "SEMI_MANUAL":
      return 50;
    case "FUTURE":
      return 20;
    default:
      return 50;
  }
}

/**
 * How much headroom this quote has against the intent's hard constraints
 * (maxFee, minimumReceived, maxDurationSeconds). Full marks (100) when no
 * constraint is set at all, or averaged headroom otherwise. Routes that
 * actually VIOLATE a hard constraint are excluded before ranking (see
 * discoverRoutes.ts and docs/security.md "Bypass the fee limit") — this
 * score only ranks among routes that already pass, by how comfortably
 * they clear the bar.
 */
export function constraintFitScore(intent: PaymentIntent, quote: Quote): number {
  const parts: number[] = [];

  if (intent.constraints.maxFee !== undefined) {
    const feeRatio = decimalRatio(quote.fee, intent.constraints.maxFee); // 0 = free, 1 = at the limit
    parts.push(clamp(100 * (1 - feeRatio)));
  }

  if (intent.destination.minimumReceived !== undefined) {
    const surplusRatio = decimalRatio(quote.destinationAmount, intent.destination.minimumReceived); // 1 = exactly at minimum
    parts.push(clamp(100 * (surplusRatio - 1) + 50));
  }

  if (intent.constraints.maxDurationSeconds !== undefined && intent.constraints.maxDurationSeconds > 0) {
    parts.push(clamp(100 * (1 - quote.estimatedDurationSeconds / intent.constraints.maxDurationSeconds)));
  }

  if (parts.length === 0) return 100; // no hard constraints set on this intent — full fit by definition

  return clamp(parts.reduce((sum, p) => sum + p, 0) / parts.length);
}

/**
 * HEURISTIC PLACEHOLDER: whether the destination corridor/currency is
 * actually reachable right now isn't reported by any rail adapter in
 * this build. If Quote.metadata carries a numeric
 * `destinationAvailability` (0-100) we use it as a real signal;
 * otherwise a neutral round number (70) — same placeholder rationale as
 * liquidityScore above.
 */
export function destinationAvailabilityScore(quote: Quote): number {
  const raw = quote.metadata?.["destinationAvailability"];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return clamp(raw);
  }
  return 70;
}

type SubScoreKey = Exclude<keyof RouteScoreBreakdown, "total">;
type Weights = Record<SubScoreKey, number>;

/**
 * Weight tables per docs/architecture.md §6 and docs/decisions.md
 * ADR-003.
 *
 * BALANCED's weights (all 1.0, constraintFitScore 2.0) are exactly what
 * the docs specify, and it's the only strategy exposed in the UI
 * (ADR-003). ADR-003 also requires all four RankingStrategy values to be
 * *implemented in the scoring code* even though only BALANCED ships in
 * the UI — the docs don't pin exact weights for the other three, so
 * these are this package's reasonable extrapolation: tilt hard toward
 * the strategy's namesake sub-score (3.0) while keeping
 * constraintFitScore's 2.0 weight, since hard-constraint fit should
 * matter under every strategy, not just BALANCED.
 */
const WEIGHTS: Record<RankingStrategy, Weights> = {
  BALANCED: {
    feeScore: 1,
    durationScore: 1,
    liquidityScore: 1,
    reliabilityScore: 1,
    constraintFitScore: 2,
    destinationAvailabilityScore: 1,
  },
  LOWEST_COST: {
    feeScore: 3,
    durationScore: 1,
    liquidityScore: 1,
    reliabilityScore: 1,
    constraintFitScore: 2,
    destinationAvailabilityScore: 1,
  },
  FASTEST: {
    feeScore: 1,
    durationScore: 3,
    liquidityScore: 1,
    reliabilityScore: 1,
    constraintFitScore: 2,
    destinationAvailabilityScore: 1,
  },
  MOST_RELIABLE: {
    feeScore: 1,
    durationScore: 1,
    liquidityScore: 1,
    reliabilityScore: 3,
    constraintFitScore: 2,
    destinationAvailabilityScore: 1,
  },
};

export function scoreRoute(
  intent: PaymentIntent,
  rail: PaymentRail,
  quote: Quote,
  strategy: RankingStrategy = "BALANCED",
): RouteScoreBreakdown {
  const weights = WEIGHTS[strategy];

  const fee = feeScore(intent, quote);
  const duration = durationScore(intent, quote);
  const liquidity = liquidityScore(quote);
  const reliability = reliabilityScore(rail);
  const constraintFit = constraintFitScore(intent, quote);
  const destinationAvailability = destinationAvailabilityScore(quote);

  const total =
    fee * weights.feeScore +
    duration * weights.durationScore +
    liquidity * weights.liquidityScore +
    reliability * weights.reliabilityScore +
    constraintFit * weights.constraintFitScore +
    destinationAvailability * weights.destinationAvailabilityScore;

  return {
    feeScore: fee,
    durationScore: duration,
    liquidityScore: liquidity,
    reliabilityScore: reliability,
    constraintFitScore: constraintFit,
    destinationAvailabilityScore: destinationAvailability,
    total,
  };
}
