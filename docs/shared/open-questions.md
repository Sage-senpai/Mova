# Open Questions

Unresolved items, each with an owner and what would resolve them.

| Question | Raised by | Blocks | Resolution path |
|---|---|---|---|
| ~~Exact x402 request/response header names~~ — **RESOLVED 2026-09-17**: live-verified against `github.com/coinbase/x402` `specs/x402-specification-v2.md` + `specs/transports-v2/http.md` (v2). No `X-` prefix: `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE`. See [decisions.md](../decisions.md) ADR-007. | Intent Engineer | — | Done |
| Does Pollar support webhooks for transfer status, or is polling the only option? | Pollar Engineer | Whether `settlement/pollar` needs a polling loop vs. an event listener | Direct confirmation from Pollar docs/support; currently UNVERIFIED, so we build polling |
| Is there a live, usable Nigerian Stellar anchor (SEP-24/31) we could target for a real (non-mocked) funding rail post-hackathon? | Rails Engineer | Whether `NigerianBankRail` could become REAL rather than MOCK | Targeted search for "Nigeria Stellar anchor SEP-24/31" — not done in this research pass |
| Concurrent requests against `AgentPolicy.dailyLimit` — two requests each under the per-transaction cap but over the daily cap together, evaluated near-simultaneously | Intent Engineer | Production-readiness of the policy engine, not the hackathon demo | Needs a transactional/serialized spend-check at the ledger layer; out of scope for the in-memory demo ledger |
| Is Pollar's BOB/Bolivia corridor claim (from third-party hackathon repos) something Pollar will confirm directly, or is it out of scope entirely? | Pollar Engineer | Whether ADR-006's SEMI_MANUAL label can ever be upgraded | Direct outreach to Pollar team/docs, not further repo archaeology |
| ~~The app's Pollar Stellar funding (treasury) wallet had not been topped up~~ — **RESOLVED 2026-09-18**: account owner funded it via dashboard.pollar.xyz (10,000 XLM). `POST /v1/users/with-wallet` now returns `201 SERVER_USER_WALLET_CREATED`. | Pollar Engineer | — | Done |
| ~~Exact response shape of `POST /v1/users/with-wallet`'s created wallet~~ — **RESOLVED**: confirmed live as `{ userId, externalId, walletAddress, funded }`. `extractPublicKey()` in `pollarClient.ts` updated to match. | Pollar Engineer | — | Done |
| ~~mova-rails.vercel.app rejected with ORIGIN_NOT_ALLOWED~~ — **RESOLVED 2026-09-18**: account owner added it to Dashboard -> Build -> Domains. Confirmed via a direct request to sdk.api.pollar.xyz/v1/applications/config (now returns success, Google + email login enabled). | Pollar Engineer | — | Done |
| Client-side "Connect wallet" + real `sendPayment()` (ADR-009) builds and typechecks and the app's config now loads successfully, but the actual login/send click-through still hasn't been verified end to end, no browser automation is available in this session | Intent/Design | Confirming the real send actually completes in production | Test the flow at mova-rails.vercel.app/pay now that the domain is allowlisted |
