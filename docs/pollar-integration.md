# Pollar Integration

Owner: Pollar / Settlement Engineer. Hard rule: never fabricate a Pollar
feature. Every capability below is tagged REAL, SANDBOX, MOCK,
SEMI-MANUAL, or FUTURE — see [architecture.md](architecture.md) §8.

**Update 2026-09-18**: real testnet credentials were obtained
(`pub_testnet_...` / `sec_testnet_...` from dashboard.pollar.xyz) and the
server-side wallet creation/funding calls documented below are live —
verified against `https://docs.pollar.xyz/llms-full.txt` and tested
directly with `curl` against `server.api.pollar.xyz`. See "Current status"
below for the one thing blocking a fully green run.

## What Pollar actually is (verified)

Pollar (`docs.pollar.xyz`, `github.com/pollar-xyz/pollar`) is an embedded
wallet + onboarding SDK for Stellar apps: `@pollar/react` /
`@pollar/core` (client-side, browser-only) plus a secret-key **Server
API** at `server.api.pollar.xyz` (backend-only). It is **not** itself a
cross-border settlement network — it's the wallet/rail primitive layer
MOVA orchestrates on top of.

The critical architectural fact, confirmed from Pollar's own Security
Model doc: **the Server API cannot move a user's funds.** Custodial
wallets are signed via AWS KMS, but "moving a user's own funds
independently" is explicitly listed as **not allowed** for the Pollar
Server — only a live, user-authenticated client-side SDK session (social
login, email OTP, or passkey) can produce a payment signature. This
isn't a MOVA design shortcut; it's the boundary Pollar's own
architecture draws. It's also exactly why the two Pollar API keys behave
so differently:

- **Publishable key** (`pub_testnet_...`) — client-side, can only
  *initiate user-authenticated operations* (login, send, quote — all
  require a live browser session).
- **Secret key** (`sec_testnet_...`) — server-side only, scoped to a
  narrow set of privileged, headless operations: register a user, create
  a custodial wallet, fund a custodial wallet's on-chain reserve, verify
  an SDK token. No send, no quote, no transaction history — those need
  the publishable key plus a real login.

## Capability table

| Capability | Status | Evidence |
|---|---|---|
| Server-side user registration (`POST /v1/users`) | **SANDBOX** | Live-tested with real `sec_testnet_` key: `201 SERVER_USER_REGISTERED` with a real `userId` |
| Server-side wallet creation + funding (`POST /v1/users/with-wallet`, `POST /v1/wallets/fund`) | **SANDBOX, code-real / currently blocked** | Real code path, real credentials, real endpoint — see "Current status" below for the one blocker |
| USDC quote | MOCK | No fiat/USDC quote endpoint exists anywhere in Pollar's docs, secret-key or otherwise. Illustrative flat-fee math only, always labeled `real: false` |
| USDC send | MOCK (architecturally not automatable headlessly) | Requires a user-signed client SDK session per Pollar's own Security Model — never available to a secret key. `mode: "REAL"` still applies to the wallet-creation call in the same request; send always falls back |
| Transfer status / history | MOCK | Only exposed via `GET sdk.api.pollar.xyz/v1/tx/history`, which needs an authenticated end-user session — no secret-key equivalent exists |
| BOB (Bolivian Boliviano) settlement leg | SEMI_MANUAL | Not found on Pollar's own docs — only third-party hackathon repos describe a USDC→BOB off-ramp. The Pollar hackathon admin's own guidance (Telegram, 2026-09-17) confirms this: "for the hackathon, mock the final BOB payout. What we evaluate is that your Nigerian path exists, works and hands off cleanly to Pollar." See [decisions.md](decisions.md) ADR-006 |

## Current status: code is real, one manual step is outstanding

`packages/settlement/pollar/src/pollarClient.ts`'s `RealPollarClient`
genuinely calls `server.api.pollar.xyz` with the real secret key on
every `createTransfer`. Verified independently via direct `curl`:

```
POST /v1/users                 -> 201 SERVER_USER_REGISTERED  (works)
POST /v1/users/with-wallet     -> 502 WALLET_CREATION_FAILED  (blocked)
```

Per Pollar's Dashboard Overview doc, a fresh app's "Get started"
checklist includes: *"App wallet created and funded — your funding
wallet must be active on Stellar with enough XLM to cover wallet
creation."* This app's funding (treasury) wallet has not yet been
topped up via the testnet Friendbot. That top-up is a **dashboard-only
action** (Treasury → Account Funding, or the Pollar MCP gateway's
`ensure_wallet_funded` tool with a Personal Access Token) — neither is
reachable with the `pub_`/`sec_` API keys alone, so it could not be
completed by an agent without dashboard/PAT access.

**The fix is one dashboard click, not a code change.** Once the app's
funding wallet is topped up:
- `RealPollarClient.createWallet` will start returning real Stellar
  G-addresses instead of falling back.
- No redeploy is needed — the fallback path and the success path are
  the same code, gated only by Pollar's own API response.
- The live demo already surfaces this correctly either way: Screen 06
  (Live Settlement) and Screen 07 (Receipt) call `/api/pollar-handoff`,
  which runs the real adapter and shows a real Stellar testnet explorer
  link when `real: true`, or an honest "Simulated" label when the
  fallback fired.

## Adapter design

`packages/settlement/pollar` implements the shared `PaymentRail`
interface (`packages/domain/src/routes/rail.ts`). Nothing outside this
package calls Pollar directly — `routing-engine` and `apps/web` only see
a `PaymentRail` (via `apps/web/app/api/pollar-handoff/route.ts` for the
live hand-off call). This means swapping Pollar for a different Stellar
wallet SDK, or adding a second settlement provider, never touches
`routing-engine` or the rest of `apps/web`.

```
MOVA domain (PaymentIntent, Quote)
        │
        ▼
PollarSettlementAdapter implements PaymentRail
        │
        ▼
RealPollarClient  ──POST /v1/users/with-wallet──▶  server.api.pollar.xyz
        │                                                 │
        │ (fallback on failure)                    real Stellar testnet
        ▼                                            G-address on success
SimulatedPollarClient (real: false)
```

## The Bolivia leg, honestly

Because the BOB corridor isn't confirmed on Pollar's own docs — and the
hackathon admin explicitly said to mock it — the demo represents it as
**semi-manual**: the adapter's real work is the NGN→USDC leg (creating
and funding a Stellar wallet for the recipient), and the final BOB
conversion is represented as a distinct, explicitly-labeled state
rather than silently presented as automated. This keeps Screen 06 (Live
Settlement) truthful about what actually executed versus what's
illustrative.

## What's FUTURE

- Client-side `@pollar/react` integration (real login + user-signed
  send) — would make the USDC send leg genuinely real, not just wallet
  creation. Requires wiring a live browser auth flow (social/email/
  passkey), which is a larger scope item than the server-side hand-off
  shipped here.
- Live production (mainnet) API keys.
- A confirmed, first-party BOB off-ramp (would need direct confirmation
  from Pollar, not third-party repos).
