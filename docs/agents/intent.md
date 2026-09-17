# Agent 4 — The Intent / Agent-Payments Engineer

## Round 0 — independent position

**What MOVA should be**: programmable payments without giving an agent
unrestricted wallet access. **Feasible**: a policy engine that blocks
rather than "probably executes," a closed decision enum
(`PASS | BLOCK | REQUIRES_APPROVAL`), nonce-based replay protection.
**Prior art worth learning from, not copying**: x402's request→402→pay→200
shape (real, multi-vendor, but single-payment only — no standing
policy); Google AP2's "signed mandate" framing (promising concept, spec
still forming, don't hardcode its wire format); Skyfire/KYAPay's
combined identity+spend-scope credential (concept worth borrowing,
schema unverified/possibly closed — don't copy it). See
[open-source-research.md](../open-source-research.md).

## Round 1 — comparing notes

**Agree with**: Red Team's demand that `humanApprovalAbove` produce a
distinct `REQUIRES_APPROVAL` state, not a silent pass.
**Disagree with**: my own first draft, corrected by the Architect — I
had the router requesting quotes before the policy check for
agent-originated intents. Fixed: policy check happens before any quote
request, full stop (see [security.md](../security.md)).
**Biggest blind spot**: I under-specified what happens when `dailyLimit`
is checked against concurrent in-flight payments (a race between two
requests both under the per-transaction limit but over the daily limit
together). Flagged in [shared/open-questions.md](../shared/open-questions.md) —
the hackathon ledger evaluates spend synchronously per request, which is
sufficient for the demo but not for concurrent production load.
**Most valuable idea from another agent**: Pollar Engineer's insistence
on capability labeling — applied it to policy decisions too
(`PolicyCheckResult.rules` records which specific rule passed/failed,
not just a boolean).
**Idea to kill**: an early idea to let agents hold a small pre-funded
"allowance" wallet directly. Killed — reintroduces the unrestricted-
wallet risk the whole policy engine exists to avoid.

## Round 2 — architecture review, vs. Red Team

Q: "Can agents safely authorize payment?" A: Only through
`AgentPolicy` → `PolicyEngine.evaluate()`, never directly; see the full
adversarial run-through in [redteam.md](redteam.md) and the mechanism
summary in [security.md](../security.md).

## x402 adapter note

Header names differ across secondary sources
(`PAYMENT-REQUIRED`/`PAYMENT-SIGNATURE` vs. `X-PAYMENT`/`X-PAYMENT-RESPONSE`).
`packages/agent-payments/x402` treats this as an implementation detail
to confirm against the live `coinbase/x402` repo, not something to guess
at in docs — see [decisions.md](../decisions.md) ADR-007.
