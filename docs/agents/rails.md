# Agent 3 — The African Rails Engineer

## Round 0 — independent position

**What MOVA should be**: honest that Nigeria has no single payment
rail — bank transfer, mobile money, and P2P/agent networks are
genuinely fragmented with different latency/reliability profiles.
**Weakness found**: most "African fintech" demos hardcode one provider
and call it done; that's exactly the lock-in this project should avoid.
**Design response**: one `PaymentRail` interface, three independent mock
implementations (`NigerianBankRail`, `P2PRail`, `DemoStablecoinRail`),
modeled on the SEP-6/31 deposit/withdrawal shape so a real anchor slots
in later without a redesign — see [african-rails.md](../african-rails.md).

## Round 1 — comparing notes

**Agree with**: Architect's decision not to build a lint-enforced import
boundary — real cost against a six-person weekend, and we already agreed
on the rule.
**Disagree with**: an early Pollar Engineer draft that treated the
stablecoin rail as purely MOCK; corrected to SANDBOX where it actually
delegates to Pollar's real USDC quote call, MOCK only for the parts
Pollar doesn't expose.
**Biggest blind spot** (mine): confidence scores in the mock rails are
tuned constants, not measured reliability — flagged explicitly in
[shared/risks.md](../shared/risks.md) rather than presented as real
statistics.
**Most valuable idea from another agent**: Intent Engineer's
`allowedRails` filter on `PaymentIntent` — lets an agent policy exclude
P2P entirely without the router needing rail-specific logic.
**Dependency needed**: Architect's final `Quote`/`Transfer` shape before
locking the three rail implementations.

## Round 2 — architecture review, vs. Architect

Q: "Can the African side actually be abstracted?" A: Yes for the
interface shape (verified against SEP-6/31's request → pending →
complete pattern); no live Nigerian bank/mobile-money integration exists
or is claimed — see the capability table in
[african-rails.md](../african-rails.md).
