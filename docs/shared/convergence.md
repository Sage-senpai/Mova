# Convergence (post Round 1)

Owner: Architect, synthesizing all six agents' Round 0/1 notes
([agents/*.md](../agents/)).

## Converged decisions

1. Modular monolith, package boundaries by convention
   ([decisions.md](../decisions.md) ADR-001/002).
2. Policy check happens before any quote is requested for
   agent-originated intents — moved earlier after Architect/Intent
   Engineer disagreement in Round 1.
3. `PaymentRail.capability` is mandatory on every rail, including
   Pollar's — proposed by Pollar Engineer, generalized by Red Team's
   quote-honesty question.
4. Nigeria's rails are represented as three independent mock
   implementations, not one — Rails Engineer's position, unopposed.
5. BOB/Bolivia settlement is SEMI_MANUAL, never REAL or SANDBOX,
   pending first-party Pollar confirmation ([decisions.md](../decisions.md)
   ADR-006) — this was the single biggest correction from Round 1
   (Architect and Pollar Engineer both initially assumed it existed).
6. UI renders `payment.state` directly everywhere; no screen infers
   status — Designer + Red Team, unopposed.
7. Agents never hold wallets; the only path to money is
   Agent → AgentPolicy → PolicyEngine → PaymentIntent → Router — Intent
   Engineer's design, hardened by Red Team's Round 4 pass.

## Ideas killed in Round 1

- `PaymentIntent.allowedRails` acting as a route *selection* rather than
  a filter (broke router authority).
- Agents holding a pre-funded "allowance" wallet directly.
- A rainbow multi-accent UI palette for route comparison.
- A full admin-dashboard treatment for Screen 12.

## Unresolved after Round 1 (carried to open-questions.md)

- Exact x402 header names (spec version drift across secondary sources).
- Concurrent-request race against `dailyLimit`.
- Whether any Nigerian Stellar anchor exists to target for a future real
  integration.
