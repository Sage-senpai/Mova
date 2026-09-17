# African Rails

Owner: Rails Engineer. Nigeria does not have one payment rail — it has
several fragmented ones (bank transfer/NIP, mobile money, P2P/agent
networks), each with different latency, reliability, and reach. MOVA's
job is to abstract them behind one interface without pretending they're
interchangeable in practice.

## Rail abstraction

All rails — African funding rails and the Pollar settlement leg alike —
implement the same `PaymentRail` interface
(`packages/domain/src/routes/rail.ts`):

```ts
interface PaymentRail {
  getQuote(intent: PaymentIntent): Promise<Quote>;
  createTransfer(intent: PaymentIntent, quote: Quote): Promise<Transfer>;
  getStatus(id: string): Promise<TransferStatus>;
  cancel?(id: string): Promise<void>;
}
```

This is deliberately the same interface a Stellar SEP-6/SEP-31 anchor
would expose (deposit request → status polling), so a future real
Nigerian anchor integration is a new adapter, not a redesign.

## Rails implemented for the hackathon

| Rail | Package | Capability | Notes |
|---|---|---|---|
| `NigerianBankRail` | `packages/payment-rails/bank` | MOCK | Deterministic fee/ETA/confidence generator; models NIP-style bank transfer characteristics (higher reliability, moderate latency) |
| `P2PRail` | `packages/payment-rails/p2p` | MOCK | Models a P2P/agent-network characteristics (lower latency, wider fee variance, lower confidence) |
| `DemoStablecoinRail` | `packages/payment-rails/stablecoin` | SANDBOX where it delegates to the real Pollar USDC quote call, MOCK for the parts Pollar doesn't expose | The only rail with any real testnet activity behind it |

None of these call a real Nigerian bank or mobile money API — that would
require licensed provider relationships and KYC infrastructure out of
scope for a hackathon, and we say so explicitly rather than faking bank
connectivity.

## SEP-style shape, without a live anchor

We modeled the mock rails' quote/status lifecycle after SEP-6/SEP-31
(request → pending → complete, deposit/withdrawal framing) specifically
so that plugging in a real Stellar anchor later is additive: implement
`PaymentRail` against the anchor's actual SEP-10/6/31 calls, register it
with the router, done. See [open-source-research.md](open-source-research.md)
§Stellar SEP Standards for the standards themselves and
[decisions.md](decisions.md) for why we didn't stand up a live anchor for
the hackathon (time, not feasibility).

## What would break this in production

- Real Nigerian rails are not one system — NIP bank transfers, mobile
  money (e.g. Opay/PalmPay-style wallets), and cash agents all have
  independent failure modes. A production `NigerianBankRail` would need
  its own retry/reconciliation logic per underlying provider, not a
  single mock generator.
- Confidence scores here are illustrative constants tuned to make the
  demo's three-route comparison plausible, not measured reliability —
  flagged in [shared/risks.md](shared/risks.md).
