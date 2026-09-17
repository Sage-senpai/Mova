# Product Positioning

Owner: whole team, synthesized by Architect + Designer after Round 5
product red team ([shared/review-rounds.md](shared/review-rounds.md)).

## The one sentence

Pollar moves the money. MOVA decides how the payment should happen.

## What MOVA is

An orchestration layer between fragmented African local payment rails,
programmable payment intents, Pollar settlement, and global destination
rails — demonstrated end-to-end on one corridor: Nigeria → Bolivia/BOB.

## What MOVA is not, and why the obvious comparisons don't hold

**"Why isn't this just Pollar?"** Pollar is a wallet/settlement
primitive (auth, wallet creation, send/receive/quote). It has no
concept of a payment *intent*, no multi-rail comparison, no policy
engine, no state machine, no audit trail. MOVA is the layer that decides
*which* rail and *whether* a payment is allowed before it ever reaches
Pollar.

**"Why isn't this just Wise?"** Wise routes a single rail relationship
per corridor and optimizes internally; it doesn't expose route
comparison, doesn't support machine-originated payments, and isn't built
on programmable, policy-constrained intents.

**"Why isn't this just x402?"** x402 authorizes and settles one
machine payment on one chain. It has no cross-border settlement, no
standing spending policy, no multi-rail routing — it's a front door
MOVA's `agent-payments/x402` package adapts into a `PaymentIntent`, not a
competing system.

**"Why isn't this just LI.FI?"** LI.FI aggregates routes across EVM
chains/DEXes. It has no Stellar support and no concept of fiat rails —
its relevant contribution is the "intent ≠ route" idea, which MOVA
applies to a completely different problem (fiat-to-fiat cross-border,
not chain-to-chain swaps).

**"Why does Africa matter?"** Because there is no single Nigerian
payment rail to integrate against — bank transfer, mobile money, and
P2P/agent networks are genuinely fragmented, each with different
latency/reliability/reach. That fragmentation is exactly what a routing
layer is for; a market with one dominant rail wouldn't need one.

**"Why does Bolivia matter?"** BOB is a controlled/thin-liquidity
currency where a stablecoin-mediated settlement leg is a real capability
gap, not a contrived example — and it's the corridor the Pollar hackathon
context points at. We're explicit (see [pollar-integration.md](pollar-integration.md))
that the specific BOB off-ramp is not yet a confirmed first-party Pollar
capability.

## What MOVA actually built (the novel contribution)

The intent → policy → routing → settlement → audit orchestration layer:
a typed `PaymentIntent`, an explicit multi-factor route scoring model, a
mandatory policy engine for agent payments, a closed payment state
machine, and an audit trail that can reconstruct any completed payment's
full decision history. None of the systems in
[open-source-research.md](open-source-research.md) provide this
combination.

## What's live vs. simulated

See [architecture.md](architecture.md) §8 for the authoritative table.
Short version: the orchestration logic (intent, routing, policy, state
machine, audit) is real and fully implemented; the rails are mocked
except for Pollar's wallet/USDC primitives running on testnet; the
Bolivia/BOB leg is semi-manual, not a live automated settlement.

## Could another team reproduce this in one day?

The domain model and state machine, yes, with effort — that's the
tradeoff of documenting the architecture this thoroughly. What's harder
to reproduce quickly is the discipline the six-agent review process
enforced: mandatory capability labeling, a closed state-transition graph,
and a policy engine that blocks rather than "probably executes." Those
are process outcomes as much as code.

## Success criteria (from the brief, tracked here so they don't drift)

- [x] Real Pollar integration demonstrated wherever current Pollar
      capabilities allow (wallet/auth/USDC quote calls, testnet).
- [x] Additional providers pluggable via the `PaymentRail` adapter
      interface.
- [x] UI expresses outcomes/constraints, not blockchain mechanics
      (Screen 03).
- [x] Novelty is the intent+policy+routing+settlement layer, not a UI
      skin on Pollar.
- [x] At least one machine-generated payment demonstrates constrained
      programmable payment (Screens 09–11, x402 adapter).
- [x] Failure, pending, expiry, refund states exist in the state
      machine, not just the happy path.
- [x] A completed payment can explain exactly what happened (Screen 08,
      `AuditEvent` trail).
- [x] Every live/mocked/sandboxed/semi-manual component is explicitly
      labeled — no invented capabilities.
