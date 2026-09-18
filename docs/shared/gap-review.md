# Gap Review — Round 6 (post-launch)

Date: 2026-09-18. Context: real Pollar credentials are live, wallet
creation/funding is confirmed working end to end, client-side connect
+ send shipped, the app is deployed and publicly reachable. This round
asks the six agents the same question from a different angle than
launch: **now that it's real and live, what's actually missing?**

Unlike earlier rounds, every gap below points at a specific file or
behavior in the current codebase, not a hypothetical.

---

## Architect

**The routing engine and policy engine are real but only one of them is
wired into the human flow.** `apps/web/app/pay/page.tsx` calls
`discoverRoutes` (real) directly, but never calls `evaluatePolicy` or
touches `InMemoryLedger` at all — those two fully-built, fully-tested
packages are only exercised by the `/api/x402-demo` route. A human
payment intent today has no policy gate and produces no ledger record;
only the machine-payment demo does. This means the brief's own success
criterion ("a completed payment can explain exactly what happened") is
true for the agent story and false for the human story — `Screen 08`
(Transaction Details) reads from a client-side `sessionStorage` snapshot,
not from `AuditEvent`s, because none get recorded for a human payment.

**Fix, scoped**: give `/pay` a companion API route (`/api/create-payment`
or similar) that constructs a real `Payment`, transitions it through
`InMemoryLedger.transitionPayment`, and records `AuditEvent`s at each
step, mirroring exactly what `/api/pollar-handoff` already does for the
Pollar leg. Screen 08 then reads real audit history instead of a
sessionStorage copy.

**Also true**: ADR-002's known gap (no lint-enforced package boundaries)
and the absence of CI (everything I've verified was verified by me,
manually, this session — nothing re-runs on the next push) are both
still exactly where they were at launch.

## Pollar / Settlement Engineer

**The quote is still 100% illustrative, and there's now a real
alternative sitting unused.** `SimulatedPollarClient.getUsdcQuote` is a
flat 0.5% fee formula. But `@pollar/react`'s `usePollar().getSwapQuote`
is real (asset-to-asset, on-chain) and now installed in `apps/web` for
the wallet-connect feature. It can't quote NGN, but it CAN quote a real
XLM-to-USDC-on-Stellar rate. Nobody's called it yet.

**The BOB leg is still fully SEMI_MANUAL** — expected, per the hackathon
admin's own instruction, not a regression. Worth restating so it doesn't
quietly get treated as "basically done": the only real leg end to end is
NGN-intent → real Stellar wallet → (optionally) real signed XLM transfer.
Nothing about BOB itself has ever been real.

**Fix, scoped**: wire `getSwapQuote({from: 'XLM', to: 'USDC'})` into the
settlement screen as a second, clearly-labeled REAL data point next to
the illustrative NGN quote, so the demo shows one number that's actually
live market data.

## African Rails Engineer

No change since launch: `NigerianBankRail`, `P2PRail`,
`DemoStablecoinRail` are still formula-generated mocks, by design, and
still explicitly labeled as such. The gap is the same one flagged at
launch (no real Nigerian rail exists to integrate against) — nothing
found in this round's ecosystem research (see below) closes it for free,
but see the FX-rate finding for a smaller, real win on the currency-math
side.

## Intent / Agent-Payments Engineer

**The agent screens are the least-real part of the whole build.**
`app/agents/page.tsx` and `app/agents/monitor/page.tsx` are static JSX
with hardcoded numbers ("12 requests," "$3.80 / $200"). They render the
same content regardless of what actually happened in `/api/x402-demo`.
Meanwhile `/api/x402-demo` genuinely calls `evaluatePolicy` and genuinely
blocks/passes — but its result never reaches those two screens. A judge
clicking from the 402 demo to the agent monitor sees numbers that have
no relationship to the request they just made.

**Nonce replay protection is implemented and untested in production.**
`InMemoryLedger.reserveNonce` exists, has a passing unit test, and is
never called by any live request path — `PaymentIntent.nonce` is never
set by `intentFromX402` or `buildIntent`. The protection is real code
with zero live exposure.

**Fix, scoped**: have `/api/x402-demo` write its `PolicyCheckResult` to
a shared in-memory store (module-level `InMemoryLedger` instance,
already the pattern used there) and have `/agents/monitor` read from it
via a small `GET /api/x402-demo/history` route, so the monitor screen
shows the actual last N requests instead of decorative numbers.

## Designer

Two honesty gaps, both fixable without new backend work:
1. Screen 08 shows hardcoded strings (`"60s from quote"`,
   `"mock-ngn-bank / demo-stablecoin"`) instead of the real quote/route
   data that's already sitting in `PersistedTransaction` — this looks
   like an oversight, not a deliberate placeholder, and should just read
   the real fields.
2. Agent screens 09/10 have no `CapabilityBadge` anywhere, unlike every
   other screen in the app — an easy, consistent fix once they're wired
   to real data per the Intent Engineer's item above.

No mobile pass has happened. Not urgent for a hackathon demo watched on
a laptop, but real.

## Red Team

New findings this round, now that real money-adjacent code is live and
public:

| Issue | Severity | Status |
|---|---|---|
| `recipientIdFromName()` uses `Math.random()` (not crypto-secure) for the externalId suffix — collision risk is low but non-zero, and it's client-visible/predictable | Low | Open, acceptable for a testnet demo, flagged so it's not forgotten if this ever handles real value |
| No rate limiting on `/api/pollar-handoff` or `/api/x402-demo` — either can be hit repeatedly by anyone, spending the app's Pollar testnet funding-wallet reserve on throwaway account creations | Medium | Open — testnet-only blast radius today, but the exact kind of thing that should be fixed before any mainnet conversation |
| Nonce replay protection exists but is never invoked (see Intent Engineer's finding) — a replay attack is not actually prevented in the live app despite the code existing | Medium | Open |
| Client sends `demoNativeSendAmount` to `sendPayment` directly — nothing server-side re-validates that the signed amount matches the original intent's constraints before the fact | Low | Open, low impact since it's the connecting user's own wallet and own money |

None of these are "the demo lies" issues — they're "the honest scope
line moved and these are now on the wrong side of it" issues.

---

## Prioritized punch list

1. Wire agent-monitor screens to real `/api/x402-demo` history (Intent Engineer + Designer, small).
2. Wire the human `/pay` flow through `policy-engine` + `ledger`, and make Screen 08 read real audit history (Architect, medium).
3. Add basic rate limiting to both API routes (Red Team, small).
4. Set `PaymentIntent.nonce` on both intent-construction paths and actually check it (Red Team, small).
5. Surface a real `getSwapQuote` number alongside the illustrative NGN quote (Pollar Engineer, small).
