# Pollar Integration

Owner: Pollar / Settlement Engineer. Hard rule: never fabricate a Pollar
feature. Every capability below is tagged REAL, SANDBOX, MOCK,
SEMI-MANUAL, or FUTURE — see [architecture.md](architecture.md) §8.

## What Pollar actually is (verified)

Pollar (`docs.pollar.xyz`, `github.com/pollar-xyz/pollar`) is an embedded
wallet + onboarding SDK for Stellar (and Solana) apps: `@pollar/react`
(components/hooks), `@pollar/core` (TS client), and a server-side REST
API. It provides social/passkey/wallet-connector auth, wallet creation
(classic Stellar account or Soroban smart wallet, with
Immediate/Deferred/Manual activation modes for KYC gating), USDC
trustline management, fee-bump sponsorship, send/receive, quotes, and
swap. It is **not** itself a cross-border settlement network — it's the
wallet/rail primitive layer MOVA orchestrates on top of.

## Capability table

| Capability | Status | Evidence |
|---|---|---|
| Wallet creation (Stellar account / Soroban smart wallet) | SANDBOX | Verified in Pollar SDK/docs; using testnet API keys for the demo |
| Auth (API key, passkey, wallet connector) | SANDBOX | Verified; demo uses testnet API keys, not production auth |
| USDC trustline + send/receive/quote/swap | SANDBOX | Verified primitives; exercised against testnet |
| BOB (Bolivian Boliviano) settlement leg | SEMI_MANUAL | **Not found on Pollar's own docs.** Only third-party hackathon repos (built on Pollar, same event) describe a USDC→BOB off-ramp. MOVA does not claim this is a native Pollar feature — see [decisions.md](decisions.md) ADR-006 |
| Fee-bump sponsorship (gasless UX) | SANDBOX | Verified feature, used to keep the demo's UX free of visible gas mechanics |
| Webhooks / event push | UNVERIFIED | Could not confirm from public docs in this research pass; MOVA polls `getStatus()` instead of assuming a webhook exists |

## Adapter design

`packages/settlement/pollar` implements the shared `PaymentRail`
interface (`packages/domain/src/routes/rail.ts`). Nothing outside this
package calls the Pollar SDK directly — `routing-engine` only ever sees
a `PaymentRail`. This means swapping Pollar for a different Stellar
wallet SDK, or adding a second settlement provider, never touches
`routing-engine` or `apps/web`.

```
MOVA domain (PaymentIntent, Quote)
        │
        ▼
PollarSettlementAdapter implements PaymentRail
        │
        ▼
@pollar/core client (testnet keys)
        │
        ▼
Stellar testnet
```

## The Bolivia leg, honestly

Because the BOB corridor isn't confirmed on Pollar's own docs, the demo
represents it as **semi-manual**: the adapter executes a real Pollar
testnet USDC transfer, and the final BOB conversion step is represented
in the UI as a distinct, explicitly-labeled state
(`DESTINATION_PENDING` → operator/demo-script confirms → `COMPLETED`)
rather than silently presented as an automated on-chain settlement. This
keeps Screen 06 (Live Settlement) truthful about what actually executed
versus what's illustrative.

## What's FUTURE

- Live production API keys / mainnet settlement.
- A confirmed, first-party BOB off-ramp (would need direct confirmation
  from Pollar, not third-party repos).
- Webhook-driven status updates instead of polling.
