# Shared Decision Log

This is the running index of binding decisions. Full rationale for each
lives in [../decisions.md](../decisions.md) (ADR format); this file is
the chronological pointer so no agent has to re-derive "did we already
decide this."

| Date (hackathon day) | Decision | ADR | Raised by | Contested by |
|---|---|---|---|---|
| D1 | Modular monolith, not microservices | ADR-001 | Architect | none |
| D1 | Package boundaries by convention, not tooling | ADR-002 | Architect | none |
| D1 | Only `BALANCED` ranking strategy in UI | ADR-003 | Intent Engineer | none |
| D1 | `PaymentRail.capability` is a required field | ADR-004 | Pollar Engineer | none |
| D1 | Amounts are decimal strings, not floats | ADR-005 | Architect | none |
| D2 | BOB/Bolivia settlement labeled SEMI_MANUAL | ADR-006 | Pollar Engineer | Architect (initially assumed REAL, corrected) |
| D2 | x402 headers verified against live repo, not docs | ADR-007 | Intent Engineer | none |
| D2 | Policy check moved before quote request for agent intents | (folded into [security.md](../security.md)) | Architect | Intent Engineer (had it later, corrected) |

Any change to the intent schema, payment states, provider interfaces,
route contracts, or policy contracts must add a row here in the same
change — see brief §24.
