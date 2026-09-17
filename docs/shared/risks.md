# Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Judge presses on whether BOB/Bolivia settlement is real | High (it's the headline corridor) | High — credibility | Demo script and docs are explicit about SEMI_MANUAL status; never claim more ([pollar-integration.md](../pollar-integration.md), [demo.md](../demo.md)) | Pollar Engineer |
| Mock rail confidence scores mistaken for real reliability data | Medium | Medium | Explicitly disclosed as tuned constants in [african-rails.md](../african-rails.md); Screen 12 labels every node's capability | Rails Engineer |
| No package-boundary lint rule means a future contributor accidentally violates the dependency direction | Medium | Low for hackathon, higher if project continues | Documented in [architecture.md](../architecture.md) §3; revisit tooling investment post-hackathon | Architect |
| x402 header names shipped wrong if the adapter is coded from secondary sources instead of the live spec | Medium | Medium — breaks the 402 demo (Screen 11) live | ADR-007: verify against `coinbase/x402` repo before coding, not from docs | Intent Engineer |
| No recipient verification/KYC | Certain (by design, out of scope) | Low for a demo, would be High for production | Explicitly out of scope, documented rather than silently absent ([security.md](../security.md)) | Rails Engineer |
| Concurrent-request race on `AgentPolicy.dailyLimit` | Low in a single-demo setting | Medium if ever run under real concurrent load | In-memory synchronous check is sufficient for the demo; flagged as a production gap, not fixed | Intent Engineer |
| Pollar SDK behavior changes between research time and implementation time (fast-moving product) | Medium | Medium | Pollar Engineer verifies against the live SDK/docs at implementation time, treats this research pass as a starting point, not a frozen spec | Pollar Engineer |
