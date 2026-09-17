import type { PaymentIntent, PaymentRail, Quote, RankingStrategy, Route, RouteHop } from "@mova/domain";
import { newRouteId } from "@mova/domain";
import { scoreRoute } from "./scoring.js";
import { decimalGte, decimalLte } from "./decimal.js";

function buildHops(rail: PaymentRail, intent: PaymentIntent): RouteHop[] {
  return [
    { label: rail.kind, railKind: rail.kind },
    { label: "MOVA", railKind: "MOVA" },
    { label: "Pollar", railKind: "POLLAR" },
    { label: intent.destination.country, railKind: "DESTINATION" },
  ];
}

/**
 * Hard-constraint check backing Route.satisfiesConstraints. Per
 * docs/security.md "Bypass the fee limit": maxFee and minimumReceived
 * (and, by the same logic, maxDurationSeconds) are hard constraints — a
 * route that violates one must be excluded from results entirely, never
 * merely down-ranked.
 */
function satisfiesHardConstraints(intent: PaymentIntent, quote: Quote): boolean {
  const { constraints, destination } = intent;

  if (constraints.maxFee !== undefined && !decimalLte(quote.fee, constraints.maxFee)) {
    return false;
  }

  if (
    destination.minimumReceived !== undefined &&
    !decimalGte(quote.destinationAmount, destination.minimumReceived)
  ) {
    return false;
  }

  if (
    constraints.maxDurationSeconds !== undefined &&
    quote.estimatedDurationSeconds > constraints.maxDurationSeconds
  ) {
    return false;
  }

  return true;
}

/**
 * Main routing-engine entry point. For every candidate rail: fetch a
 * quote, score it, and check it against the intent's hard constraints.
 *
 * A rail's getQuote() failing (provider outage, timeout, whatever) means
 * THAT rail is unavailable — it is skipped, not thrown as an error for
 * the whole discovery pass (docs/security.md "Provider outage freezes
 * the app" fix).
 *
 * A route that fails satisfiesHardConstraints is excluded entirely,
 * never returned merely down-ranked (docs/security.md "Bypass the fee
 * limit" fix) — the `satisfiesConstraints` flag stays on the Route type
 * for auditability, but every Route this function returns already has
 * it set to true.
 */
export async function discoverRoutes(
  intent: PaymentIntent,
  rails: PaymentRail[],
  strategy: RankingStrategy = "BALANCED",
): Promise<Route[]> {
  const routes: Route[] = [];

  for (const rail of rails) {
    let quote: Quote;
    try {
      quote = await rail.getQuote(intent);
    } catch {
      continue;
    }

    if (!satisfiesHardConstraints(intent, quote)) {
      continue;
    }

    const score = scoreRoute(intent, rail, quote, strategy);

    const route: Route = {
      id: newRouteId(),
      intentId: intent.id,
      hops: buildHops(rail, intent),
      estimatedDurationSeconds: quote.estimatedDurationSeconds,
      fee: quote.fee,
      expectedReceived: quote.destinationAmount,
      confidence: score.reliabilityScore / 100,
      score,
      satisfiesConstraints: true,
    };

    routes.push(route);
  }

  routes.sort((a, b) => b.score.total - a.score.total);
  return routes;
}
