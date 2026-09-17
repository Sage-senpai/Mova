# Agent 5 — The Product Designer / Frontend Engineer

## Round 0 — independent position

**What MOVA should look like**: luxury financial instrument × technical
instrument panel × experimental editorial interface — not a crypto
dashboard. **Hates**: generic fintech cards, rainbow Web3 gradients,
glassmorphism, button soup, dashboards for their own sake. **Feasible in
a weekend**: one accent color, one type pairing (sans for UI, mono for
transaction data), an 8px spacing scale, motion that only fires on real
state change. **What would make a judge remember it**: Screen 04's route
comparison feeling like an operating system choosing a route, and Screen
06's settlement visualization reading as a real system state machine,
not a progress bar with a label swapped every few seconds.

## Round 1 — comparing notes

**Agree with**: Architect's insistence that the UI render `payment.state`
directly rather than inferring "done-ness" from partial data — that's
also just better design discipline (no state a screen can't actually
justify).
**Disagree with**: an early version of Screen 03 that exposed "route,"
"chain," and "wallet" as user-facing fields — pushed those to Screen 08
behind "expand technical details." See [ui.md](../ui.md).
**Biggest blind spot**: I initially designed Screen 12 (Route Health) as
a full admin dashboard. Cut down per the brief's explicit instruction —
it's a network map with four stats per node, not a dashboard.
**Most valuable idea from another agent**: Pollar Engineer's capability
labels gave me a legitimate reason for Screen 12's node coloring (REAL/
SANDBOX/MOCK/SEMI_MANUAL/FUTURE map directly to visual states) instead of
an arbitrary "health" color scale.
**Idea to kill**: a rainbow multi-accent palette I drafted for route
comparison cards — killed, replaced with the one-signal-color rule plus
typographic weight to differentiate routes.

## Round 2 — architecture review, vs. everyone

Q: "Are we exposing complexity the user should never see?" A: Screens
01–07 (the human flow) never mention chains, gas, or wallets. Screens
08–12 (technical/operator views) are explicitly gated behind
"advanced"/"technical" affordances, matching
[architecture.md](../architecture.md) §8's REAL/MOCK table so the extra
detail is earned, not decorative.
