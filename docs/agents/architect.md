# Agent 1 — The Architect

## Round 0 — independent position

**What MOVA should be**: a small, honest orchestration layer over one
corridor — intent in, routed and policy-checked settlement out, full
audit trail. **What it should not be**: a UI skin on Pollar, or a second
wallet. **Feasible in one weekend**: domain model, state machine,
routing engine with mocked rails, one real Pollar testnet path, x402
front door. **Novel**: the intent/policy/routing/settlement composition
itself, not any single piece. **Existing systems that already solve
pieces of this**: Pollar (wallet), x402 (agent payment trigger), Stellar
SEPs (anchor shape), LI.FI (intent/route separation concept) — see
[open-source-research.md](../open-source-research.md). **Weaknesses
found**: none of the above combine intent + policy + multi-rail
comparison + auditability in one place. **What would make this fail**:
claiming a Pollar capability that doesn't exist, or a state machine
loose enough that the UI can say "complete" before settlement finishes.
**What a judge would remember**: a route-discovery screen that visibly
scores tradeoffs instead of just showing "cheapest."

## Round 1 — comparing notes

**Agree with**: Rails Engineer's insistence that Nigeria isn't one rail;
Red Team's insistence on a closed state-transition graph.
**Disagree with**: initial Intent Engineer draft that let the router
request quotes before a policy check for agent-originated intents —
moved policy check earlier in the pipeline (see [security.md](../security.md)).
**Biggest blind spot** (mine, surfaced by Pollar Engineer): I initially
assumed Pollar had a documented BOB corridor; it doesn't — see
[decisions.md](../decisions.md) ADR-006.
**Most valuable idea from another agent**: Designer's progressive-
disclosure rule (no blockchain terms until Screen 08) — it directly
shapes what the domain model needs to expose at which layer.
**Idea to kill**: an early draft that let `PaymentIntent.allowedRails`
double as a route *selection* — killed because it broke router
authority (see [domain-model.md](../domain-model.md)).
**Dependency needed from others**: Rails Engineer's concrete `PaymentRail`
implementations before the routing engine's scoring model can be
demoed end-to-end.

## Round 2 — architecture review, vs. Pollar Engineer

Q: "Can it actually use Pollar?" A: Yes for wallet/auth/USDC
primitives on testnet; no for a first-party BOB corridor. Resolved by
labeling the Bolivia leg SEMI_MANUAL rather than blocking the demo on an
unconfirmed capability.

## Standing position after review

Converged view recorded in [shared/convergence.md](../shared/convergence.md).
