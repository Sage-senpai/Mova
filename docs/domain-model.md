# Domain Model

Owner: Architect. Source of truth: `packages/domain/src`. This document
explains the model; the code is authoritative if they ever disagree —
update this file in the same change that changes the code.

## Entities

```
User            packages/domain/src/actors/user.ts
Recipient       packages/domain/src/actors/user.ts
Agent           packages/domain/src/actors/user.ts
PaymentIntent   packages/domain/src/intents/paymentIntent.ts
Quote           packages/domain/src/routes/quote.ts
Route           packages/domain/src/routes/route.ts
PaymentRail     packages/domain/src/routes/rail.ts   (interface, not a stored entity)
AgentPolicy     packages/domain/src/policies/policy.ts
Payment         packages/domain/src/payments/payment.ts
Settlement      packages/domain/src/payments/settlement.ts
AuditEvent      packages/domain/src/events/auditEvent.ts
```

## Relationships

```
User
 └─ PaymentIntent
     └─ Quote (one per candidate rail)
         └─ Route (scored, ranked)
             └─ Payment
                 └─ Settlement
                     └─ AuditEvent[]
```

For agents:

```
Agent
 └─ AgentPolicy
     └─ PaymentIntent   (policy.id attached; policy MUST pass before Quote is requested)
         └─ Route
             └─ Settlement
```

## Why `PaymentIntent` doesn't carry a chosen route

The intent expresses the *outcome* (minimum received, max fee, max
duration) — never a rail choice. `allowedRails` is an optional narrowing
filter, not a selection. This is the line that keeps the router
authoritative: a client can restrict which rails are eligible, but
cannot dictate which one wins.

## Why amounts are strings, never numbers

`Money`-shaped fields (`source.amount`, `fee`, `sourceAmount`, etc.) are
decimal strings throughout the domain layer. Floating-point arithmetic on
money is a correctness bug waiting to happen; any arithmetic needed by
the routing engine happens through a decimal library at the edges, never
by treating these fields as JS numbers.

## Why IDs are branded types

`IntentId`, `QuoteId`, `RouteId`, etc. are structurally identical
strings but nominally distinct via `packages/domain/src/ids.ts`'s brand
pattern. This is a compile-time-only guard (zero runtime cost) against
passing a `RouteId` where a `QuoteId` is expected — a class of bug that's
easy to introduce once `Payment` starts referencing four different IDs.

## Why `PaymentRail.capability` is mandatory

Every rail — mocked or real — must self-report `REAL | SANDBOX | MOCK |
SEMI_MANUAL | FUTURE`. This is not optional metadata: Screen 12 (Route
Health) and Screen 08 (Transaction Details) read it directly, and the
receipt (Screen 07) traces it into the audit trail. See
[security.md](security.md) §honesty and [decisions.md](decisions.md) ADR-004.

## Payment state machine

See `packages/domain/src/payments/paymentState.ts`. Full transition
graph:

```
CREATED → QUOTED → AUTHORIZED → FUNDING → FUNDED → SETTLING → DESTINATION_PENDING → COMPLETED

CREATED         → ROUTE_UNAVAILABLE, CANCELLED
QUOTED          → QUOTE_EXPIRED, CANCELLED
AUTHORIZED      → CANCELLED
FUNDING         → FUNDING_FAILED, CANCELLED
FUNDING_FAILED  → REFUND_PENDING, CANCELLED
SETTLING        → SETTLEMENT_FAILED
SETTLEMENT_FAILED → REFUND_PENDING
DESTINATION_PENDING → DESTINATION_FAILED
DESTINATION_FAILED → REFUND_PENDING
REFUND_PENDING  → REFUNDED
```

`COMPLETED`, `QUOTE_EXPIRED`, `ROUTE_UNAVAILABLE`, `CANCELLED`,
`REFUNDED` are terminal. No other module may construct a transition not
in this list; `assertTransition` throws `IllegalPaymentTransitionError`
if one is attempted.
