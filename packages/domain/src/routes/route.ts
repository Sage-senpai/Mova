import type { RouteId, IntentId } from "../ids.js";
import type { RailKind } from "./rail.js";

export type RouteHop = {
  label: string;
  railKind: RailKind | "MOVA" | "POLLAR" | "DESTINATION";
};

/**
 * Weighted sub-scores behind a route's final ranking. Every weight is
 * documented in docs/architecture.md §routing engine — never silently
 * re-tuned without updating that doc (see decision-log.md).
 */
export type RouteScoreBreakdown = {
  feeScore: number;
  durationScore: number;
  liquidityScore: number;
  reliabilityScore: number;
  constraintFitScore: number;
  destinationAvailabilityScore: number;
  total: number;
};

export type Route = {
  id: RouteId;
  intentId: IntentId;

  hops: RouteHop[];

  estimatedDurationSeconds: number;
  fee: string;
  expectedReceived: string;
  confidence: number;

  score: RouteScoreBreakdown;

  /** Does this route satisfy the intent's hard constraints (maxFee, minimumReceived, etc)? */
  satisfiesConstraints: boolean;
};

export type RankingStrategy = "BALANCED" | "LOWEST_COST" | "FASTEST" | "MOST_RELIABLE";
