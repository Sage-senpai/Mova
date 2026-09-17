# Open Questions

Unresolved items, each with an owner and what would resolve them.

| Question | Raised by | Blocks | Resolution path |
|---|---|---|---|
| ~~Exact x402 request/response header names~~ — **RESOLVED 2026-09-17**: live-verified against `github.com/coinbase/x402` `specs/x402-specification-v2.md` + `specs/transports-v2/http.md` (v2). No `X-` prefix: `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE`. See [decisions.md](../decisions.md) ADR-007. | Intent Engineer | — | Done |
| Does Pollar support webhooks for transfer status, or is polling the only option? | Pollar Engineer | Whether `settlement/pollar` needs a polling loop vs. an event listener | Direct confirmation from Pollar docs/support; currently UNVERIFIED, so we build polling |
| Is there a live, usable Nigerian Stellar anchor (SEP-24/31) we could target for a real (non-mocked) funding rail post-hackathon? | Rails Engineer | Whether `NigerianBankRail` could become REAL rather than MOCK | Targeted search for "Nigeria Stellar anchor SEP-24/31" — not done in this research pass |
| Concurrent requests against `AgentPolicy.dailyLimit` — two requests each under the per-transaction cap but over the daily cap together, evaluated near-simultaneously | Intent Engineer | Production-readiness of the policy engine, not the hackathon demo | Needs a transactional/serialized spend-check at the ledger layer; out of scope for the in-memory demo ledger |
| Is Pollar's BOB/Bolivia corridor claim (from third-party hackathon repos) something Pollar will confirm directly, or is it out of scope entirely? | Pollar Engineer | Whether ADR-006's SEMI_MANUAL label can ever be upgraded | Direct outreach to Pollar team/docs, not further repo archaeology |
