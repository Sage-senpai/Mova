# Review Rounds

Index of the six-agent collaboration protocol's rounds. Full content
lives in each agent's own doc; this file is the map.

- **Round 0 — independent thinking**: each agent's unprompted position,
  in [agents/architect.md](../agents/architect.md),
  [agents/pollar.md](../agents/pollar.md), [agents/rails.md](../agents/rails.md),
  [agents/intent.md](../agents/intent.md), [agents/design.md](../agents/design.md),
  [agents/redteam.md](../agents/redteam.md) (§Round 0 sections).
- **Round 1 — compare notes**: agree/disagree/blind-spot/best-idea/kill/
  dependency, in each agent doc's §Round 1, synthesized in
  [convergence.md](convergence.md).
- **Round 2 — architecture review**: Architect vs. Pollar Engineer,
  Rails Engineer vs. Architect, Intent Engineer vs. Red Team, Designer
  vs. everyone — the specific exchanges are recorded in each agent doc's
  §Round 2.
- **Round 3 — build**: implementation against the shared contracts fixed
  in `packages/domain`; see [../architecture.md](../architecture.md) and
  [decision-log.md](decision-log.md) for anything that changed a shared
  interface mid-build.
- **Round 4 — security red team**: full issue table in
  [agents/redteam.md](../agents/redteam.md) §Round 4.
- **Round 5 — product red team**: "why isn't this just X" answers in
  [../product.md](../product.md), Red Team's standing objection in
  [agents/redteam.md](../agents/redteam.md) §Round 5.
- **Round 6 — post-launch gap review**: with real Pollar credentials
  live and the app deployed, each agent re-examined the actual running
  system (not the plan) for what's still not real or not wired up. Full
  findings and a prioritized punch list in [gap-review.md](gap-review.md).
