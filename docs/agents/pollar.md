# Agent 2 — The Pollar / Settlement Engineer

## Round 0 — independent position

**What MOVA should be**: honest about Pollar's actual surface area — a
wallet/auth/USDC SDK, not a cross-border settlement network. **Feasible**:
real testnet calls for wallet creation, auth, USDC quote/send; nothing
claimed beyond that. **Weakness found in Pollar itself**: no first-party
documentation of a BOB/Bolivia corridor — every claim I found tracing to
that came from third-party hackathon repos, not `docs.pollar.xyz`. That
gap has to be visible in the product, not papered over.

## Round 1 — comparing notes

**Agree with**: Architect's provider-adapter boundary — I never want
`routing-engine` calling `@pollar/core` directly.
**Disagree with**: an early assumption (mine) that webhooks were
available for status push; I could not verify this from public docs, so
`settlement/pollar` polls `getStatus()` instead — flagged UNVERIFIED in
[pollar-integration.md](../pollar-integration.md) rather than assumed.
**Biggest blind spot**: I almost let "the hackathon context implies a
Bolivia corridor exists" stand in for verification. Caught in review —
see [decisions.md](../decisions.md) ADR-006.
**Most valuable idea from another agent**: Red Team's question "can a
provider lie about a quote?" — directly produced the mandatory
`capability` field on every rail, not just Pollar's.
**Idea to kill**: none from my side this round.
**Dependency needed**: Intent Engineer's `Quote` shape finalized before
I can map Pollar's SDK response onto it.

## Round 2 — architecture review, vs. Architect

Confirmed: Pollar adapter implements `PaymentRail`; capability is
`SANDBOX` for wallet/USDC, `SEMI_MANUAL` for the Bolivia leg, `UNVERIFIED`
noted (not shipped as a type value) for webhook support specifically in
docs since it's a documentation gap, not a runtime capability.

## Hard rule, restated

If a desired capability doesn't exist or can't be verified: label it
REAL / SANDBOX / MOCK / SEMI-MANUAL / FUTURE and say so in
[pollar-integration.md](../pollar-integration.md). Never fabricate for
the demo.
