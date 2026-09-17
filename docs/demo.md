# Demo Script

One corridor, two stories, one closing line.

## Story 1 — Human intent

1. Landing (Screen 01) → "Create payment."
2. Create intent (Screen 03): recipient Carlos Mendoza, they receive
   Bs 2,000, you can spend ₦150,000, maximum fee ₦3,000, complete within
   10 minutes.
3. Route discovery (Screen 04): three viable routes appear
   (Bank→MOVA→Pollar→BOB, P2P→MOVA→Pollar→BOB, Stablecoin→MOVA→Pollar→BOB),
   each showing ETA/fee/receive/confidence. Narrate: "MOVA isn't picking
   the cheapest number, it's scoring fee, speed, liquidity, reliability,
   and constraint fit — here's why route 1 wins."
4. Authorization (Screen 05): show the exact commitment (minimum
   received, maximum fee, expiry countdown) before anything executes.
5. Live settlement (Screen 06): FUNDING → SETTLING → CONVERTING →
   DELIVERING → COMPLETE, narrated against the real Pollar testnet call
   underneath (see [pollar-integration.md](pollar-integration.md) for
   what's actually executing vs. semi-manual).
6. Receipt (Screen 07) → expand to Transaction Details (Screen 08): "A
   completed payment can explain exactly what happened — here's the full
   decision trail."

## Story 2 — Machine intent

1. Agent policy (Screen 09): Translation Bot, $200/day, $50/payment max,
   human approval above $25, Nigeria→Bolivia only.
2. 402 demo (Screen 11): an API call returns `402 Payment Required
   $0.20` → MOVA policy check → intent → route → Pollar → `200 OK`.
3. Agent monitor (Screen 10): show the one blocked request among the
   fulfilled ones, and why it was blocked (policy rule, not a crash).

## Closing line

"Pollar moves the money. MOVA decides how the payment should happen."

## What the demo must never claim

Per [security.md](security.md) §honesty: no screen states or implies
that the Bolivia/BOB settlement leg is a fully automated first-party
Pollar capability. If asked directly by a judge, the honest answer is in
[pollar-integration.md](pollar-integration.md) — real testnet Pollar
calls for wallet/USDC, semi-manual for the BOB conversion step.
