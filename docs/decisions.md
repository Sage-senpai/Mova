# Decision Log (ADRs)

Format: context, decision, why, status. Superseding a decision means
adding a new entry, not editing the old one.

## ADR-001: Modular monolith, not microservices

**Context**: Section 9 of the brief explicitly warns against
microservice sprawl for a one-corridor hackathon build.
**Decision**: One Next.js app + a set of internal packages under a single
pnpm workspace, deployed as one artifact.
**Why**: Six people, one weekend, one corridor. Network boundaries
between services would add latency and failure modes we'd have to fake
anyway. The package boundaries give us the same interface discipline
without deployment overhead.
**Status**: Accepted.

## ADR-002: Package boundaries enforced by convention, not tooling

**Context**: `docs/architecture.md` §3 defines a strict dependency
direction (domain has no deps; nothing imports sideways between rail
packages).
**Decision**: We do not add an ESLint import-boundary rule for the
hackathon.
**Why**: Real cost (setup + false positives eating review time) against a
team of six who already agreed on the rule in Round 2. Revisit if the
project continues past the hackathon.
**Status**: Accepted, flagged as a known gap in [shared/risks.md](shared/risks.md).

## ADR-003: Only one ranking strategy ships in the UI

**Context**: Section 12 allows for `LOWEST_COST` / `FASTEST` /
`MOST_RELIABLE` / `BALANCED` but only requires one default for the MVP.
**Decision**: Model all four in `RankingStrategy`, implement scoring for
all four in `routing-engine`, but the UI (Screen 04) only exposes
`BALANCED`.
**Why**: Keeps the type honest about where this goes next without adding
UI surface area nobody will demo. Trivial to expose a selector later
since the engine already supports it.
**Status**: Accepted.

## ADR-004: `PaymentRail.capability` is a required field, not a doc comment

**Context**: Round 4 red team asked "can a provider lie about a quote?"
and "can we explain exactly what happened to a user's money?"
**Decision**: `capability: REAL | SANDBOX | MOCK | SEMI_MANUAL | FUTURE`
is a required field on the `PaymentRail` interface and is threaded
through `Quote.metadata`, `Settlement.capability`, and surfaced on
Screens 08 and 12.
**Why**: Making honesty a type-level requirement means a new rail
implementation cannot compile without declaring what it actually is.
**Status**: Accepted.

## ADR-005: Amounts are decimal strings, not floats

**Context**: Money math with IEEE-754 floats silently loses cents.
**Decision**: Every amount field in `domain` is a string; decimal
arithmetic happens at call sites using a decimal library, never native
`+`/`*` on parsed floats.
**Why**: Standard fintech practice; the failure mode (off-by-a-cent
totals in a payment receipt) is exactly the kind of bug a demo judge
would notice.
**Status**: Accepted.

## ADR-006: BOB/Bolivia settlement is labeled SEMI_MANUAL, not REAL

**Context**: [open-source-research.md](open-source-research.md) found no
primary-source confirmation from Pollar that a BOB/Bolivia corridor
exists in their product; only third-party hackathon repos claim it.
Confirmed independently on 2026-09-17 by the Pollar hackathon admin in
the event Telegram: "for the hackathon, mock the final BOB payout. What
we evaluate is that your Nigerian path exists, works and hands off
cleanly to Pollar."
**Decision**: The Pollar settlement adapter's Bolivia leg ships labeled
`SEMI_MANUAL` (or `MOCK` if no manual step is demonstrable), never `REAL`
or even `SANDBOX`, regardless of demo pressure to claim otherwise. The
NGN→Pollar hand-off itself (wallet creation/funding) is the part that
must be real — see [pollar-integration.md](pollar-integration.md).
**Why**: [security.md](security.md) §honesty — MOVA does not fabricate
provider capability for a better demo.
**Status**: Accepted. Owner: Pollar Engineer, cross-checked by Architect.

## ADR-008: Real Pollar wallet creation/funding, secret key server-side only

**Context**: Real testnet credentials (`pub_testnet_...` / `sec_testnet_...`)
were obtained 2026-09-17. Pollar's own Security Model doc confirms the
secret key can only perform a narrow set of headless operations (user
registration, wallet creation, wallet funding, token verification) —
never sending funds or reading transaction history, which require a
live user-signed client session.
**Decision**: `packages/settlement/pollar`'s `RealPollarClient` calls
Pollar's live Server API (`server.api.pollar.xyz`) for wallet creation
and funding only. Every other operation (quote, send, status) stays on
`SimulatedPollarClient`, and every result carries an explicit `real:
boolean` field rather than being inferred. `POLLAR_SECRET_KEY` is
server-side only (Vercel production env var, `.env.local` locally,
never committed, never sent to the browser).
**Why**: Matches Pollar's actual architecture rather than pretending a
secret key can do more than it can — see [pollar-integration.md](pollar-integration.md).
**Status**: Accepted. Blocked on one external step (the app's Stellar
funding wallet needs a testnet top-up via Pollar's dashboard) — tracked
in [pollar-integration.md](pollar-integration.md) "Current status."

## ADR-007: x402 header names verified against the live spec before coding

**Context**: Research found conflicting header-name claims
(`PAYMENT-REQUIRED`/`PAYMENT-SIGNATURE` vs. `X-PAYMENT`/`X-PAYMENT-RESPONSE`)
across secondary sources.
**Decision**: `packages/agent-payments/x402` implementation pulls exact
header names from `github.com/coinbase/x402`'s current spec, not from
this doc set.
**Resolved 2026-09-17**: live-checked via the GitHub contents API against
`specs/x402-specification-v2.md` and `specs/transports-v2/http.md`
(protocol version 2). Current header names have **no `X-` prefix**:
`PAYMENT-REQUIRED` (server→client, 402 challenge), `PAYMENT-SIGNATURE`
(client→server, payment payload), `PAYMENT-RESPONSE` (server→client,
settlement result). The commonly-blogged `X-PAYMENT`/`X-PAYMENT-RESPONSE`
convention does not appear in the current spec. This is a point-in-time
read of one repo/version — re-verify before treating it as permanently
fixed. See `packages/agent-payments/x402/src/build402Response.ts`.
**Why**: Don't ship a demo that's wrong about the one protocol detail a
technical judge is likely to check.
**Status**: Accepted and verified.
