# MOVA Architecture

Owner: Architect. Reviewed by: Pollar Engineer, Rails Engineer, Intent
Engineer, Designer, Red Team.

## 1. Thesis

Users and agents specify what payment outcome they want. MOVA determines
how that outcome can safely be executed. Pollar moves the money; MOVA
decides how the payment should happen.

## 2. Shape: modular monolith

One deployable app for the hackathon, split into strictly bounded
packages so any package could become its own service later without a
domain-model rewrite. No microservices — see [decisions.md](decisions.md) ADR-001.

```
apps/
  web/                    Next.js app — the 12 screens, API routes

packages/
  domain/                 Shared types + state machine (this is the contract)
    intents/ payments/ routes/ policies/ actors/ events/
  routing-engine/         Intent -> candidate routes -> scored ranking
  payment-rails/          PaymentRail implementations (bank, p2p, stablecoin)
  settlement/pollar/      Pollar adapter (implements PaymentRail + settlement)
  agent-payments/x402/    x402 <-> PaymentIntent bridge
  policy-engine/          AgentPolicy evaluation
  ledger/                 Payment + AuditEvent persistence (in-memory for demo)
  ui/                     Design-system primitives shared by apps/web
  testkit/                Fixtures / fake clock / deterministic IDs for tests

docs/
```

## 3. Boundaries (what may depend on what)

```
apps/web  ─────────────►  routing-engine, policy-engine, ledger, agent-payments/x402, ui
routing-engine ─────────►  domain, payment-rails, settlement/pollar
payment-rails/* ────────►  domain            (no cross-imports between bank/p2p/stablecoin)
settlement/pollar ──────►  domain
policy-engine ──────────►  domain
agent-payments/x402 ────►  domain, policy-engine, routing-engine
ledger ─────────────────►  domain
```

`domain` depends on nothing else in this repo. Every other package
depends only on `domain` plus the packages directly above it in the
list — never on `apps/web`, and never sideways between sibling rail
implementations. This is enforced by convention for the hackathon
(see [decisions.md](decisions.md) ADR-002 on why we didn't add a lint rule for it).

## 4. Provider adapter boundary

Every external system MOVA talks to — a bank rail, a P2P network, a
stablecoin rail, Pollar itself — is reached only through the
`PaymentRail` interface defined in `packages/domain/src/routes/rail.ts`:

```ts
interface PaymentRail {
  readonly capability: "REAL" | "SANDBOX" | "MOCK" | "SEMI_MANUAL" | "FUTURE";
  getQuote(intent: PaymentIntent): Promise<Quote>;
  createTransfer(intent: PaymentIntent, quote: Quote): Promise<Transfer>;
  getStatus(id: string): Promise<TransferStatus>;
  cancel?(id: string): Promise<void>;
}
```

The `capability` field is mandatory and surfaced all the way to the UI
(Screen 12, Route Health) — see [security.md](security.md) §honesty. Nothing
in `routing-engine` or `apps/web` is allowed to special-case a specific
provider; it only ever calls the interface.

## 5. Domain model

See [domain-model.md](domain-model.md) for the full entity list and the
authoritative payment state machine. The core flow:

```
PaymentIntent -> Quote(s) -> Route(s) -> PolicyCheck -> Payment -> Settlement -> AuditEvent[]
```

For agent-originated intents:

```
Agent -> AgentPolicy -> PaymentIntent -> Route -> Settlement
```

## 6. Routing engine

Not lowest-fee-wins. A route's rank is:

```
score = feeScore + durationScore + liquidityScore
      + reliabilityScore + constraintFitScore
      + destinationAvailabilityScore
```

Hackathon MVP ships one strategy, `BALANCED`, with equal weight (1.0) on
every sub-score except `constraintFitScore` (2.0 — a route that violates
a hard constraint like `maxFee` or `minimumReceived` must not simply rank
lower, it must be excluded). `LOWEST_COST` / `FASTEST` / `MOST_RELIABLE`
are modeled in the type (`RankingStrategy`) but not exposed in the UI —
see [decisions.md](decisions.md) ADR-003.

## 7. Payment state machine

Centralized in `packages/domain/src/payments/paymentState.ts` as an
explicit transition allow-list (`canTransition`/`assertTransition`). No
package outside `domain` is allowed to construct a `PaymentState` string
literal that isn't already in that union — this is what closes the
red-team question "can the UI say complete while settlement is pending?"
(the UI reads `payment.state`, it never infers state from partial data).

## 8. What is REAL vs MOCK in this build

| Component | Status | Why |
|---|---|---|
| Pollar wallet/auth/quote calls | SANDBOX | Pollar SDK verified real (testnet keys); see [pollar-integration.md](pollar-integration.md) |
| BOB / Bolivia settlement leg | SEMI_MANUAL | Not confirmed on Pollar's own docs, only third-party hackathon repos — see [open-source-research.md](open-source-research.md) |
| Nigerian bank rail | MOCK | No live bank integration for the hackathon |
| P2P rail | MOCK | Illustrative only |
| Stablecoin rail | SANDBOX where it maps to Pollar's real USDC trustline calls, MOCK otherwise |
| x402 front door | REAL protocol shape, MOCK facilitator | See [docs/agents/intent.md](agents/intent.md) |
| Routing engine, policy engine, state machine | REAL | Fully implemented, not mocked — this is MOVA's actual contribution |

## 9. Open questions and risks

See [shared/open-questions.md](shared/open-questions.md) and
[shared/risks.md](shared/risks.md).
