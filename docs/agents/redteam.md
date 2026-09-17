# Agent 6 — Red Team

## Round 0 — independent position

Assume every other agent's design is wrong until it survives an
adversarial pass. The two things most likely to sink this project:
(1) a state machine loose enough to let the UI lie about payment status,
(2) an agent policy with a "probably fine" escape hatch. Everything else
is recoverable; those two are trust-destroying.

## Round 4 — security red team

| # | Issue | Severity | Root cause | Fix | Owner | Status |
|---|---|---|---|---|---|---|
| 1 | Bypass the fee limit | High | Router could rank a route above `maxFee` instead of excluding it | `Route.satisfiesConstraints` excludes, doesn't just down-rank, any route violating a hard constraint | Intent Engineer | Fixed |
| 2 | Reuse an old intent | High | No replay protection on signed intents | `PaymentIntent.nonce`, ledger rejects duplicate `(sender, nonce)` | Intent Engineer | Fixed |
| 3 | Execute after expiry | High | Quote/intent expiry checked only at creation | `isExpired()`/`isQuoteExpired()` re-checked at every transition past `QUOTED`/before `FUNDING` | Architect | Fixed |
| 4 | Agent overspend across multiple requests | Medium | Naive per-transaction-only limit check | `dailyLimit` checked against cumulative spend, not just the current transaction | Intent Engineer | Fixed |
| 5 | Failed transaction counted as successful | Critical | Loosely-typed status strings let a partial failure render as done | Closed `PaymentState` transition graph; `COMPLETED` only reachable from `DESTINATION_PENDING` | Architect | Fixed |
| 6 | UI says "complete" while settlement is pending | Critical | UI inferring status from partial data instead of reading canonical state | UI renders `payment.state` directly, no independent "looks done" heuristic | Designer | Fixed |
| 7 | Provider lies about a quote | Medium | No way to distinguish a real quote from an illustrative one | Mandatory `PaymentRail.capability`, surfaced on Screens 08/12 | Pollar Engineer | Fixed |
| 8 | Stale route executes | High | Route not re-validated against its source quote at authorization time | Authorization re-checks `isQuoteExpired()` before `FUNDING` | Intent Engineer | Fixed |
| 9 | Duplicate payment | High | Same as #2 at the payment layer | Nonce uniqueness enforced at ledger write, not just intent creation | Intent Engineer | Fixed |
| 10 | Fake recipient | Medium | No KYC/recipient verification in scope | Explicitly out of scope for hackathon; documented, not silently ignored | Rails Engineer | Accepted risk — see [shared/risks.md](../shared/risks.md) |
| 11 | Provider outage freezes the app | Medium | Router treated any rail failure as fatal | `getQuote()` failure on one rail returns "route unavailable" for that rail only; others still return | Rails Engineer | Fixed |
| 12 | Can't explain what happened to a user's money | Critical | No consistent event vocabulary | Fixed `AuditEventType` union, threaded through every state transition | Architect | Fixed |

## Round 5 — product red team

Answers synthesized into [product.md](../product.md) (the "why isn't
this just X" section). Red Team's standing note: the weakest point in
that section is Bolivia/BOB — if a judge presses on whether the corridor
is real, the honest answer is semi-manual, and the demo script
([demo.md](../demo.md)) is written to never claim otherwise.

## Standing objection carried into build

Confidence percentages shown on route comparison (Screen 04) are tuned
constants from the mock rails, not measured reliability. This is
disclosed in [african-rails.md](../african-rails.md) and
[shared/risks.md](../shared/risks.md) rather than presented as live
statistics — Red Team considers this acceptable for a hackathon demo
only because it's disclosed, not because it's resolved.
