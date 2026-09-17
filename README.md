# MOVA

Intent-driven payment orchestration between fragmented African local
payment rails, programmable payment intents, Pollar settlement, and
global destination rails. Primary corridor: Nigeria → Bolivia / BOB.

> Pollar moves the money. MOVA decides how the payment should happen.

## What this is not

Not a wallet, not a bridge, not "Pollar but prettier," not a generic
x402 clone, not an AI chatbot that sends money. See
[docs/product.md](docs/product.md) for the full positioning, including
why the obvious comparisons (Pollar, Wise, x402, LI.FI) don't hold.

## Start here

- [docs/architecture.md](docs/architecture.md) — system shape, package
  boundaries, provider adapter interface, routing engine, state machine.
- [docs/domain-model.md](docs/domain-model.md) — entities and why the
  types are shaped the way they are.
- [docs/product.md](docs/product.md) — positioning and success criteria.
- [docs/ui.md](docs/ui.md) — design language and the 12-screen inventory.
- [docs/demo.md](docs/demo.md) — the two-story demo script.
- [docs/security.md](docs/security.md) — agent safety model.
- [docs/pollar-integration.md](docs/pollar-integration.md) and
  [docs/african-rails.md](docs/african-rails.md) — what's REAL, SANDBOX,
  MOCK, SEMI_MANUAL, or FUTURE, and why.
- [docs/open-source-research.md](docs/open-source-research.md) — Pollar,
  x402, Stellar SEPs, and prior art, with confidence-tagged sourcing.
- [docs/agents/](docs/agents/) and [docs/shared/](docs/shared/) — the
  six-agent review process: independent positions, disagreements,
  convergence, and the red-team pass.

## Structure

```
apps/web/                 Next.js app — the 12 screens
packages/domain/          Shared types + payment state machine
packages/routing-engine/  Intent -> scored, ranked routes
packages/payment-rails/   Bank / P2P / stablecoin rail adapters
packages/settlement/pollar/  Pollar adapter
packages/agent-payments/x402/  x402 <-> PaymentIntent bridge
packages/policy-engine/   Agent policy evaluation
packages/ledger/          Payment + audit event persistence
packages/ui/              Shared design-system primitives
packages/testkit/         Fixtures for deterministic tests
```

## Running locally

```
pnpm install
pnpm dev
```

## Honesty

Every provider and rail declares a capability level — REAL, SANDBOX,
MOCK, SEMI_MANUAL, or FUTURE — enforced at the type level
(`PaymentRail.capability`) and surfaced in the UI, not just in these
docs. See [docs/architecture.md](docs/architecture.md) §8 for the
current table.
