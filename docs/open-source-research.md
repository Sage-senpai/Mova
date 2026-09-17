# Open-Source & Prior-Art Research

Owner: Architect. Verification pass by Pollar Engineer and Intent Engineer.
Method: weakness-first — we searched for what these systems get *wrong*,
not for code to copy. Confidence tags: **VERIFIED** (primary source),
**PLAUSIBLE** (secondary source, unconfirmed), **COULD NOT VERIFY**.

## Pollar

**VERIFIED** (docs.pollar.xyz, github.com/pollar-xyz/pollar, demo.pollar.xyz)

- What it is: an embedded-wallet + onboarding SDK for Stellar (+ Solana)
  apps — "payments & ramp orchestrator for LATAM builders." Not a
  settlement network itself; it wraps wallet creation, auth, and
  send/receive/quote/swap primitives.
- Mature: social login, passkeys, wallet connectors (Freighter, Albedo,
  Phantom, Solflare, Backpack), API-key auth with separate testnet/mainnet
  keys, USDC trustline management, fee-bump sponsorship (gasless UX),
  multichain settlement via Circle CCTP.
- Weak / missing: no first-party cross-border routing, no policy engine,
  no payment-intent abstraction, no multi-rail comparison. It is a
  wallet/rail primitive, not an orchestrator — which is exactly the gap
  MOVA fills.
- **BOB / Bolivia corridor: NOT confirmed on Pollar's own docs.** Evidence
  for a Nigeria↔Bolivia / USDC→BOB off-ramp comes only from third-party
  hackathon repos built on top of Pollar for this same event, not from
  Pollar's primary documentation. MOVA treats this corridor as
  **SANDBOX/SEMI-MANUAL at best** — see [docs/pollar-integration.md](pollar-integration.md).
- What MOVA reuses: the wallet/auth/quote primitives as the settlement
  adapter's underlying calls.
- What MOVA does NOT copy: we do not reimplement wallet creation or KYC —
  that stays inside Pollar's SDK, accessed only through our adapter.

## x402

**VERIFIED** (github.com/coinbase/x402, x402.org, Cloudflare Agents docs)

- What it solves: machine-to-machine payment authorization over plain
  HTTP — a 402 response carries payment requirements, the client retries
  with a payment payload, a facilitator verifies/settles.
- Mature: multi-vendor ecosystem (Coinbase, Cloudflare, independent
  facilitators like x402-rs), governed by an x402 Foundation, real
  adoption on Base and Solana.
- Weak / missing: x402 authorizes and settles a *single* payment — it has
  no concept of a standing spending policy, no cross-border rail, no
  notion of "route options." It assumes the payer already has funded
  crypto on a supported chain.
- **CAUTION**: exact request/response header names are disputed across
  secondary sources (`PAYMENT-REQUIRED`/`PAYMENT-SIGNATURE` vs.
  `X-PAYMENT`/`X-PAYMENT-RESPONSE`). MOVA's x402 adapter (`packages/agent-payments/x402`)
  must read the header names from the live `coinbase/x402` repo at
  implementation time, not from this doc — flagged in
  [decision-log.md](shared/decision-log.md).
- What MOVA reuses: the request → 402 → payment payload → settle → 200
  shape, as the trigger that creates a `PaymentIntent`.
- What MOVA does NOT copy: we do not reimplement a facilitator or chain
  settlement — x402 stays a *front door* into MOVA's own policy engine
  and router, not a parallel settlement path.

## Stellar SEP Standards (SEP-6, SEP-10, SEP-24, SEP-31)

**VERIFIED** (developers.stellar.org)

- SEP-10: challenge/response wallet auth, the base every other SEP needs.
- SEP-6: programmatic (API-only) deposit/withdrawal — fits a headless
  orchestrator like MOVA better than a hosted UI.
- SEP-24: hosted deposit/withdrawal with anchor-owned KYC UI.
- SEP-31: anchor-to-anchor cross-border payment API — the standard shape
  for a Nigeria→Bolivia leg between a sending and receiving anchor.
- Mature: long-established, production-adopted; reference
  implementations exist (Stellar Anchor Platform, `django-polaris`).
- Weak / missing for MOVA's purposes: no SEP defines *route comparison*
  across multiple rails, and no confirmed live Nigerian anchor was
  identified in this research pass.
- What MOVA reuses: the anchor-pair mental model (funding anchor →
  receiving anchor) as the shape of `NigerianBankRail` and the Pollar
  settlement adapter's interface, even where the concrete rail is mocked.
- What MOVA does NOT copy: we do not stand up a real anchor for the
  hackathon; SEP-24/31 integration is labeled **FUTURE**.

## Prior Art: Routing, Intents, Agent Policy

| Project | Solves | Mature | Weak/Missing | Reuse as concept | Do NOT copy |
|---|---|---|---|---|---|
| LI.FI (+ LI.FI Intents / ERC-7683) | Cross-chain bridge/DEX route aggregation, exact-output "intent" execution | Very mature for EVM | No Stellar support; irrelevant infra for us | "Intent = desired outcome, solver picks the route" separation | EVM/Solidity execution code |
| Google AP2 (Agent Payments Protocol) | Signed "mandates" binding amount/merchant/intent for agent purchases | Emerging (2026), PLAUSIBLE via secondary sources | No cross-border settlement; spec still forming | Expressing policy as a signed mandate rather than ad hoc config | Do not assume a stable wire format — unverified |
| Skyfire / KYAPay | Combined identity + spend-authorization credential ("Know Your Agent") for agent payments | PLAUSIBLE, unconfirmed license/schema | Closed/unclear spec | A single credential carrying both identity and spend scope | Do not copy claim schema — unverified and possibly non-open |
| ERC-8004 | Portable on-chain agent identity | EVM-only standard | Not applicable to Stellar directly | Portable agent identity as a concept | Direct reuse (wrong chain) |

## What this means for MOVA

MOVA's genuine contribution is the layer none of the above provide on
their own: **payment intent → policy check → multi-rail route comparison
→ Pollar settlement → auditable receipt**, with African funding rails and
Bolivian/BOB settlement as the concrete corridor. Pollar gives us wallet
and settlement primitives; x402 gives us a machine-payment front door;
Stellar SEPs give us the on/off-ramp shape. None of them is the
orchestration layer itself.
