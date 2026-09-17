# UI Design Language

Owner: Designer. Reference mockup: 12-screen dark editorial panel set
(landing → command center → create intent → route discovery →
authorization → live settlement → receipt → transaction details →
agent policy → agent monitor → 402 demo → route health).

## Character

Luxury financial instrument × technical instrument panel × experimental
editorial interface. Not a crypto dashboard. Minimal, eccentric, quiet,
confident, technical, slightly strange — never chaotic.

## Tokens

```
--bg:            near-black ink            #0B0C0E
--surface:       barely-lifted panel       #121316
--text-primary:  warm off-white            #F4F1EC
--text-secondary:muted cool gray           #8A8F98
--signal:        one electric accent       #6BD1FF  (used for active routes, primary CTA)
--warning:       restrained amber          #E0A857
--error:         restrained red            #D9695F
--success:       muted green (state pulses only) #6FBF8C
```

One accent, not ten. Warning/error are used only for state, never for
decoration.

## Typography

One display/system sans for UI text, one mono face for transaction data,
amounts, IDs, and timestamps. Implemented as system font stacks
(`--font-sans`/`--font-mono` in `apps/web/app/globals.css`) rather than a
fetched webfont — no network dependency at build time, and it degrades
cleanly across platforms. Large monetary amounts (₦150,000) are sized to
visually dominate their surrounding label text ("Send money") — see
Screen 02/03/06/07 in the mockup.

## Spacing

8px base unit. Prefer 24 / 32 / 48 / 64 / 96px over ad hoc values.

## Shape

Sharp containers by default, 4–12px radii where softening is needed,
circles reserved for semantically meaningful nodes (route hops, state
dots) — never decorative pill buttons everywhere.

## Cards

Sparse composition over boxed cards. Prefer:

```
              ₦150,000

Nigeria  ────────→  Bolivia
```

over a bordered card with a title and labeled rows.

## Motion

Motion communicates system state, never fills empty space:

- traveling particles along a route line during settlement
- expanding node rings on state transition
- quote countdown timers (Screen 05's 29s expiry)
- settlement pulses per hop (Screen 06's FUNDING → SETTLING → CONVERTING
  → DELIVERING → COMPLETE)

## Screen inventory

The 12 screens map 1:1 to the reference mockup and to the domain model:

| # | Screen | Backed by |
|---|---|---|
| 01 | Landing / system intro | static |
| 02 | Home / command center | `Payment[]` (recent), aggregate balance |
| 03 | Create intent | `PaymentIntent` draft |
| 04 | Route discovery | `Route[]` from routing-engine, scored |
| 05 | Intent authorization | selected `Route` + `Quote` expiry countdown |
| 06 | Live settlement | `Payment.state` transitions, real-time |
| 07 | Receipt / payment proof | completed `Payment` + `Settlement` |
| 08 | Transaction details | `Payment.history`, `AuditEvent[]`, `Quote`, `Settlement` |
| 09 | Agent policy | `AgentPolicy` |
| 10 | Agent payment monitor | `Agent` activity, `PolicyCheckResult[]` |
| 11 | 402 / machine payment demo | `agent-payments/x402` flow |
| 12 | Route health / operator view | `PaymentRail.capability` + live status per rail |

## What the Designer pushed back on

Progressive disclosure over blockchain terminology: Screen 03 never
says "chain," "gas," or "wallet address" — it says recipient, they
receive, you can spend, maximum fee, complete within. Technical detail
(quote IDs, settlement IDs, exchange rates) is deferred to Screen 08,
reached by explicit "expand technical details," never shown by default.
