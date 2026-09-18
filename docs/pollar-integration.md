# Pollar Integration

Owner: Pollar / Settlement Engineer. Hard rule: never fabricate a Pollar
feature. Every capability below is tagged REAL, SANDBOX, MOCK,
SEMI-MANUAL, or FUTURE — see [architecture.md](architecture.md) §8.

**Update 2026-09-18**: real testnet credentials were obtained
(`pub_testnet_...` / `sec_testnet_...` from dashboard.pollar.xyz) and the
server-side wallet creation/funding calls documented below are live —
verified against `https://docs.pollar.xyz/llms-full.txt` and tested
directly with `curl` against `server.api.pollar.xyz`. **Resolved same
day**: the app's Stellar funding wallet was topped up (10,000 XLM) via
the dashboard, and `RealPollarClient.createWallet` now genuinely returns
`real: true` with an actual funded Stellar testnet G-address — see
"Current status" below.

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
| Server-side wallet creation + funding (`POST /v1/users/with-wallet`) | **SANDBOX, confirmed working** | `201 SERVER_USER_WALLET_CREATED` with a real, funded Stellar testnet G-address. `RealPollarClient.createWallet` returns `real: true` end to end |
| USDC quote | MOCK | No fiat/USDC quote endpoint exists anywhere in Pollar's docs, secret-key or otherwise. Illustrative flat-fee math only, always labeled `real: false` |
| USDC send | MOCK (architecturally not automatable headlessly) | Requires a user-signed client SDK session per Pollar's own Security Model — never available to a secret key. `mode: "REAL"` still applies to the wallet-creation call in the same request; send always falls back |
| Transfer status / history | MOCK | Only exposed via `GET sdk.api.pollar.xyz/v1/tx/history`, which needs an authenticated end-user session — no secret-key equivalent exists |
| BOB (Bolivian Boliviano) settlement leg | SEMI_MANUAL | Not found on Pollar's own docs — only third-party hackathon repos describe a USDC→BOB off-ramp. The Pollar hackathon admin's own guidance (Telegram, 2026-09-17) confirms this: "for the hackathon, mock the final BOB payout. What we evaluate is that your Nigerian path exists, works and hands off cleanly to Pollar." See [decisions.md](decisions.md) ADR-006 |

## Current status: confirmed working end to end

`packages/settlement/pollar/src/pollarClient.ts`'s `RealPollarClient`
genuinely calls `server.api.pollar.xyz` with the real secret key on
every `createTransfer`. Verified independently via direct `curl`:

```
POST /v1/users               -> 201 SERVER_USER_REGISTERED  (works)
POST /v1/users/with-wallet   -> 201 SERVER_USER_WALLET_CREATED  (works)
  { "content": { "userId": "...", "externalId": "...",
                 "walletAddress": "G...", "funded": true } }
```

This was initially blocked by `502 WALLET_CREATION_FAILED` — per
Pollar's Dashboard Overview doc, a fresh app's "Get started" checklist
requires *"App wallet created and funded — your funding wallet must be
active on Stellar with enough XLM to cover wallet creation."* Resolved
2026-09-18 by funding the app's treasury wallet (10,000 XLM) via
Dashboard → Treasury → Account Funding.

That fix also revealed the real response shape — `content.walletAddress`,
not `content.publicKey` as originally guessed defensively — now reflected
in `extractPublicKey()`.

- `RealPollarClient.createWallet` now returns real Stellar G-addresses
  with `real: true`.
- The live demo surfaces this on Screen 06 (Live Settlement) and Screen
  07 (Receipt) via `/api/pollar-handoff`: a real Stellar testnet explorer
  link when `real: true`, or an honest "Simulated" label if a future
  call ever falls back (e.g. transient Stellar network issues, per
  Pollar's own documented error codes).

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

## How MOVA finds a recipient

Worth being explicit about, since it's an easy thing to assume is more
solved than it is: MOVA does not resolve a recipient's real-world
identity to a wallet address. A real system does that one of two ways,
neither of which is "look up their name":

- The recipient already has a wallet, looked up by something that
  actually identifies them (email, a registered username), never free
  text.
- The sender already has the recipient's real wallet address (a Stellar
  `G...` key) and provides it directly, the same way any crypto transfer
  works.

What this demo does by default is neither: the typed recipient name is
just a label. `app/api/pollar-handoff/route.ts` uses it (via
`recipientIdFromName()` in `app/pay/intentMath.ts`) to provision a
**brand-new** Pollar-custodied wallet, not to find an existing person.
Two different names produce two different throwaway wallets; the same
name typed twice does not resolve to "the same Carlos." This is a real,
legitimate pattern (Pollar's Deferred funding mode exists for exactly
this: create a wallet for someone before they've logged in), but it is
not identity resolution, and the create-intent form says so.

For the honest version, the form also accepts an optional real Stellar
address. When set, `/api/pollar-handoff` sends to that exact existing
wallet and skips provisioning entirely, no different from pasting an
address into any wallet's send screen. This is flagged in
[security.md](security.md)'s "fake recipient" red-team item, now
partially closed rather than fully open.

## Client-side send: connect wallet, sign for real

Shipped 2026-09-18. `apps/web` now wraps the app in `PollarProvider`
(`@pollar/react`, publishable key only) and Screen 03's create-intent
form has a "Connect Pollar wallet (testnet)" button
(`app/pay/WalletConnectPanel.tsx`) that opens Pollar's own login modal
(social, email OTP, or passkey — whichever methods the dashboard has
enabled).

Once connected, the settlement step does something the server-side
secret key architecturally cannot: it calls `sendPayment()` from the
connected wallet's own signed session, sending a real, automatically
sized native-XLM payment (derived from the entered NGN amount, see
`demoNativeSendAmount()` in `app/pay/intentMath.ts`) to the real Stellar
testnet address the server just created via `/api/pollar-handoff`. This
closes the loop end to end: real recipient wallet, real sender wallet,
real signed transfer between them, both verifiable on a testnet
explorer.

If no wallet is connected, the flow degrades exactly as before, the
server-side hand-off still runs and is shown, and the client-side send
is honestly labeled "skipped" rather than silently omitted.

**One dashboard step this may still need**: Pollar's SDK calls require
the calling origin to be in the app's allowed Domains list (Dashboard
→ Build → Domains), the same category of one-time config as the
treasury top-up earlier. If the login modal or `sendPayment` fails in
production, check that `mova-rails.vercel.app` (and any other domain
this is served from) is on that allowlist — this wasn't something an
agent could configure without dashboard access, so it's untested against
the live production domain as of this writing.

## What's FUTURE

- Live production (mainnet) API keys.
- A confirmed, first-party BOB off-ramp (would need direct confirmation
  from Pollar, not third-party repos).
- A real quote for the NGN leg itself (Pollar's `getSwapQuote` is real
  but asset-to-asset on-chain, not fiat-to-fiat — there's no fiat NGN/BOB
  quote endpoint anywhere in Pollar's public API surface).
