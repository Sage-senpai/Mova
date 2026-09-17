# Security & Agent Safety Model

Owner: Intent/Agent-Payments Engineer, adversarially reviewed by Red
Team ([agents/redteam.md](agents/redteam.md)).

## Honesty as a design constraint

Every provider and rail in MOVA self-reports a capability level — REAL,
SANDBOX, MOCK, SEMI_MANUAL, FUTURE (`PaymentRail.capability`, see
[architecture.md](architecture.md) §4). This is not a README claim, it's
a required field threaded into `Quote.metadata`, `Settlement.capability`,
and rendered on Screens 08 and 12. A completed payment must be able to
reconstruct: what the user asked for → what MOVA chose → why → what
actually happened — see the `AuditEvent` vocabulary in
[domain-model.md](domain-model.md).

## Agent safety model

An `Agent` never holds a wallet or unrestricted spending capability. The
only path from an agent to money is:

```
Agent request
     ↓
AgentPolicy (packages/domain/src/policies/policy.ts)
     ↓
PolicyEngine.evaluate() → PASS | BLOCK | REQUIRES_APPROVAL
     ↓
PaymentIntent  (only created on PASS or after human approval)
     ↓
Router → Route → Payment → Settlement
```

`AgentPolicy` enforces, all mandatory, all checked before a `Quote` is
even requested:

```
amount ≤ maxPerTransaction
cumulative spend today ≤ dailyLimit
destination ∈ allowedDestinations
asset ∈ allowedAssets
fee ≤ intent.constraints.maxFee (once known)
slippage ≤ maxSlippageBps (once known)
amount > humanApprovalAbove  →  decision = REQUIRES_APPROVAL, not PASS
now < intent.constraints.expiry
```

If any mandatory rule fails, the decision is `BLOCK`. There is no
"probably execute" path — `PolicyCheckResult.decision` is a closed enum
(`PASS | BLOCK | REQUIRES_APPROVAL`), and `routing-engine` refuses to
request a quote for anything other than `PASS`.

Replay protection: a signed intent carries a `nonce`
(`PaymentIntent.nonce`); the ledger rejects a `PaymentIntent` whose
`(sender, nonce)` pair has already been consumed.

Emergency disable: `Agent.status` (`ACTIVE | PAUSED | DISABLED`) is
checked before policy evaluation — flipping it to `DISABLED` blocks every
future intent from that agent immediately, independent of policy limits.

## Red team questions this model must survive

Full write-up with severity/root-cause/fix/owner/status in
[agents/redteam.md](agents/redteam.md). Summary of the mechanism that
answers each:

- **Bypass the fee limit** → `maxFee` is a hard constraint checked both
  in policy evaluation and in `Route.satisfiesConstraints`; a route that
  violates it is excluded, not down-ranked.
- **Reuse an old intent** → nonce + expiry, checked at intent creation
  and again at authorization.
- **Execute after expiry** → `isExpired()` / `isQuoteExpired()` are
  checked at every state transition that would move a payment past
  `QUOTED`; an expired quote can only transition to `QUOTE_EXPIRED`.
- **Agent overspend** → `dailyLimit` is evaluated against cumulative
  spend, not per-transaction only.
- **Failed transaction counted as successful** → `PaymentState` is a
  closed transition graph (`paymentState.ts`); `COMPLETED` is only
  reachable from `DESTINATION_PENDING`, never directly from `SETTLING`
  or `FUNDING`.
- **UI says "complete" while settlement is pending** → the UI renders
  `payment.state` directly; it has no independent "looks done" heuristic.
- **Provider lies about a quote** → `capability` labeling means a MOCK or
  SEMI_MANUAL quote is visibly flagged, never presented with the same
  confidence UI as a SANDBOX/REAL one.
- **Stale route executes** → `Route` is derived from a `Quote`, which
  expires; authorization re-checks `isQuoteExpired()` before `FUNDING`.
- **Duplicate payment** → nonce uniqueness at the ledger layer.
- **Fake recipient** → out of scope for the hackathon (no KYC), flagged
  in [shared/risks.md](shared/risks.md), not silently ignored.
- **Provider outage freezes the app** → `routing-engine` treats a rail
  `getQuote()` failure as "route unavailable," not as a fatal app error;
  other rails' quotes still return.
