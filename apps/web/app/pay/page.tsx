"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePollar } from "@pollar/react";
import { BigAmount, Button, CapabilityBadge, Field, RouteHops } from "@mova/ui";
import type { Capability } from "@mova/ui";
import type { PaymentIntent, PaymentState, Route } from "@mova/domain";
import { canTransition } from "@mova/domain";
import { TopNav } from "../components/TopNav";
import { WalletConnectPanel } from "./WalletConnectPanel";
import {
  DEFAULT_DRAFT,
  buildIntent,
  demoNativeSendAmount,
  discoverRealRoutes,
  formatEta,
  routeLabel,
  saveTransaction,
  spendFromTheyReceive,
  theyReceiveFromSpend,
  type DraftIntent,
} from "./intentMath";

type Step = "create" | "discovering" | "routes" | "authorize" | "settlement" | "receipt";

type PollarHandoff = {
  status: "idle" | "loading" | "done" | "error";
  real: boolean;
  capability: Capability | null;
  providerRef: string | null;
  explorerUrl: string | null;
};

const IDLE_HANDOFF: PollarHandoff = {
  status: "idle",
  real: false,
  capability: null,
  providerRef: null,
  explorerUrl: null,
};

type RealSend = {
  status: "idle" | "sending" | "sent" | "skipped" | "error";
  hash: string | null;
  amount: string | null;
};

const IDLE_SEND: RealSend = { status: "idle", hash: null, amount: null };

const SETTLEMENT_STEPS: { state: PaymentState; label: string }[] = [
  { state: "FUNDING", label: "Funding" },
  { state: "FUNDED", label: "Funding" },
  { state: "SETTLING", label: "Settling" },
  { state: "DESTINATION_PENDING", label: "Delivering" },
  { state: "COMPLETED", label: "Complete" },
];

export default function PayPage() {
  const [step, setStep] = useState<Step>("create");
  const [draft, setDraft] = useState<DraftIntent>(DEFAULT_DRAFT);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string>("");
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [expirySeconds, setExpirySeconds] = useState(30);
  const [paymentState, setPaymentState] = useState<PaymentState>("CREATED");
  const [pollarHandoff, setPollarHandoff] = useState<PollarHandoff>(IDLE_HANDOFF);
  const [realSend, setRealSend] = useState<RealSend>(IDLE_SEND);
  const { isAuthenticated, sendPayment } = usePollar();

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

  async function handleCreate() {
    setStep("discovering");
    const builtIntent = buildIntent(draft);
    setIntent(builtIntent);
    setIntentId(builtIntent.id);
    // Real @mova/routing-engine scoring against the three MOCK rail
    // implementations — not a simplified re-derivation of that logic.
    const found = await discoverRealRoutes(builtIntent);
    setRoutes(found);
    setSelectedRouteId(found[0]?.id ?? null);
    setPaymentState("QUOTED");
    setStep("routes");
  }

  // Authorization expiry countdown
  useEffect(() => {
    if (step !== "authorize") return;
    setExpirySeconds(30);
    const id = setInterval(() => {
      setExpirySeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  // The real Pollar hand-off: fires once per settlement, independent of
  // the settlement-state-machine playback timer below. Hits
  // /api/pollar-handoff, which runs the actual PollarSettlementAdapter —
  // see docs/pollar-integration.md for exactly what is and isn't real.
  useEffect(() => {
    if (step !== "settlement" || !intent) return;
    let cancelled = false;
    setPollarHandoff({ ...IDLE_HANDOFF, status: "loading" });
    setRealSend(IDLE_SEND);

    fetch("/api/pollar-handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent }),
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (cancelled) return;
        setPollarHandoff({
          status: "done",
          real: Boolean(data.real),
          capability: data.capability ?? null,
          providerRef: data.providerRef ?? null,
          explorerUrl: data.explorerUrl ?? null,
        });

        // The real leg: only possible once a Pollar wallet is connected
        // client-side (see WalletConnectPanel) — per Pollar's own Security
        // Model, only a live user-signed session can move funds, never the
        // server-side secret key that created data.providerRef above.
        if (!data.real || !isAuthenticated) {
          setRealSend({ ...IDLE_SEND, status: "skipped" });
          return;
        }

        const amount = demoNativeSendAmount(draft.youCanSpend);
        setRealSend({ status: "sending", hash: null, amount });
        try {
          const outcome = await sendPayment({
            destination: data.providerRef,
            amount,
            asset: { type: "native" },
          });
          if (cancelled) return;
          if (outcome.status === "error") {
            setRealSend({ status: "error", hash: null, amount });
          } else {
            setRealSend({ status: "sent", hash: outcome.hash, amount });
          }
        } catch {
          if (!cancelled) setRealSend({ status: "error", hash: null, amount });
        }
      })
      .catch(() => {
        if (!cancelled) setPollarHandoff({ ...IDLE_HANDOFF, status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, intent]);

  // Settlement state machine playback
  useEffect(() => {
    if (step !== "settlement") return;
    let i = 0;
    setPaymentState("FUNDING");
    const id = setInterval(() => {
      i += 1;
      const next = SETTLEMENT_STEPS[Math.min(i, SETTLEMENT_STEPS.length - 1)]!.state;
      setPaymentState((prev) => (canTransition(prev, next) ? next : prev));
      if (next === "COMPLETED") {
        clearInterval(id);
        if (selectedRoute) {
          saveTransaction({
            intentId,
            draft,
            route: selectedRoute,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          });
        }
        setTimeout(() => setStep("receipt"), 900);
      }
    }, 1100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const activeHopIndex = useMemo(() => {
    switch (paymentState) {
      case "FUNDING":
      case "FUNDED":
        return 0;
      case "SETTLING":
        return 1;
      case "DESTINATION_PENDING":
        return 2;
      case "COMPLETED":
        return 3;
      default:
        return -1;
    }
  }, [paymentState]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        {step === "create" && <CreateIntentStep draft={draft} setDraft={setDraft} onContinue={handleCreate} />}

        {step === "discovering" && (
          <p className="py-24 text-center text-sm uppercase tracking-[0.2em] text-mist">
            Finding routes…
          </p>
        )}

        {step === "routes" && selectedRoute && (
          <RouteDiscoveryStep
            routes={routes}
            selectedId={selectedRoute.id}
            onSelect={setSelectedRouteId}
            onContinue={() => setStep("authorize")}
          />
        )}

        {step === "authorize" && selectedRoute && (
          <AuthorizeStep
            draft={draft}
            route={selectedRoute}
            expirySeconds={expirySeconds}
            onBack={() => setStep("routes")}
            onAuthorize={() => setStep("settlement")}
          />
        )}

        {step === "settlement" && selectedRoute && (
          <SettlementStep
            draft={draft}
            paymentState={paymentState}
            activeHopIndex={activeHopIndex}
            pollarHandoff={pollarHandoff}
            realSend={realSend}
          />
        )}

        {step === "receipt" && selectedRoute && (
          <ReceiptStep
            draft={draft}
            route={selectedRoute}
            intentId={intentId}
            pollarHandoff={pollarHandoff}
            realSend={realSend}
          />
        )}
      </main>
    </div>
  );
}

function CreateIntentStep({
  draft,
  setDraft,
  onContinue,
}: {
  draft: DraftIntent;
  setDraft: (d: DraftIntent) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg tracking-wide text-mist">PAY</h1>
        <WalletConnectPanel />
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-mist">Recipient</label>
        <input
          className="mt-2 w-full border-b border-white/15 bg-transparent pb-2 text-xl text-paper outline-none focus:border-signal"
          value={draft.recipientName}
          onChange={(e) => setDraft({ ...draft, recipientName: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-xs uppercase tracking-wider text-mist">They receive</label>
          <div className="mt-2 flex items-baseline gap-2 border-b border-white/15 pb-2">
            <span className="text-mist">{draft.destinationCurrency}</span>
            <input
              className="w-full bg-transparent text-xl text-paper outline-none focus:border-signal"
              value={draft.theyReceive}
              onChange={(e) =>
                setDraft({ ...draft, theyReceive: e.target.value, youCanSpend: spendFromTheyReceive(e.target.value) })
              }
            />
          </div>
          <p className="mt-1 text-xs text-mist">Minimum amount · auto-updates spend</p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-mist">You can spend</label>
          <div className="mt-2 flex items-baseline gap-2 border-b border-white/15 pb-2">
            <span className="text-mist">{draft.sourceCurrency}</span>
            <input
              className="w-full bg-transparent text-xl text-paper outline-none focus:border-signal"
              value={draft.youCanSpend}
              onChange={(e) =>
                setDraft({ ...draft, youCanSpend: e.target.value, theyReceive: theyReceiveFromSpend(e.target.value) })
              }
            />
          </div>
          <p className="mt-1 text-xs text-mist">Your total spend · auto-updates receive</p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-mist">Maximum fee</label>
          <div className="mt-2 flex items-baseline gap-2 border-b border-white/15 pb-2">
            <span className="text-mist">{draft.sourceCurrency}</span>
            <input
              className="w-full bg-transparent text-xl text-paper outline-none focus:border-signal"
              value={draft.maxFee}
              onChange={(e) => setDraft({ ...draft, maxFee: e.target.value })}
            />
          </div>
          <p className="mt-1 text-xs text-mist">Include fees</p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-mist">Complete within</label>
          <div className="mt-2 flex items-baseline gap-2 border-b border-white/15 pb-2">
            <input
              type="number"
              className="w-full bg-transparent text-xl text-paper outline-none focus:border-signal"
              value={draft.completeWithinMinutes}
              onChange={(e) => setDraft({ ...draft, completeWithinMinutes: Number(e.target.value) })}
            />
            <span className="text-mist">minutes</span>
          </div>
        </div>
      </div>

      <Button onClick={onContinue} className="mt-4 self-start">
        Continue
      </Button>
    </div>
  );
}

function RouteDiscoveryStep({
  routes,
  selectedId,
  onSelect,
  onContinue,
}: {
  routes: Route[];
  selectedId: string;
  onSelect: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-lg tracking-wide text-mist">ROUTING</h1>
        <p className="mt-1 text-2xl text-paper">{routes.length} viable routes found</p>
      </div>

      <div className="flex flex-col gap-4">
        {routes.map((route, i) => {
          const isSelected = route.id === selectedId;
          return (
            <button
              key={route.id}
              onClick={() => onSelect(route.id)}
              className={`rounded-md border p-5 text-left transition-colors ${
                isSelected ? "border-signal bg-panel" : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-mist">{routeLabel(route)}</span>
                {i === 0 ? (
                  <span className="rounded-sm bg-ok/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ok">
                    Best value
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                <Field label="ETA" value={formatEta(route.estimatedDurationSeconds)} />
                <Field label="Fee" value={`₦${route.fee}`} />
                <Field label="Receive" value={`Bs ${route.expectedReceived}`} />
                <Field label="Confidence" value={`${(route.confidence * 100).toFixed(1)}%`} />
              </div>
            </button>
          );
        })}
      </div>

      <Button onClick={onContinue} className="self-start">
        Continue
      </Button>
    </div>
  );
}

function AuthorizeStep({
  draft,
  route,
  expirySeconds,
  onBack,
  onAuthorize,
}: {
  draft: DraftIntent;
  route: Route;
  expirySeconds: number;
  onBack: () => void;
  onAuthorize: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg tracking-wide text-mist">YOU ARE AUTHORIZING</h1>

      <div className="rounded-md border border-white/10 bg-panel p-6">
        <div className="grid grid-cols-2 gap-6">
          <Field label="Recipient" value={draft.recipientName} mono={false} />
          <Field label="Expires" value={`${expirySeconds}s`} />
          <Field label="Minimum received" value={`Bs ${draft.theyReceive}`} />
          <Field label="Maximum fee" value={`₦${draft.maxFee}`} />
        </div>
        <div className="mt-6 border-t border-white/10 pt-4">
          <span className="text-[11px] uppercase tracking-[0.14em] text-mist">Route</span>
          <p className="mt-1 font-mono text-sm text-paper">{routeLabel(route)}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={onAuthorize} disabled={expirySeconds === 0}>
          Authorize
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Change route
        </Button>
      </div>
    </div>
  );
}

function SettlementStep({
  draft,
  paymentState,
  activeHopIndex,
  pollarHandoff,
  realSend,
}: {
  draft: DraftIntent;
  paymentState: PaymentState;
  activeHopIndex: number;
  pollarHandoff: PollarHandoff;
  realSend: RealSend;
}) {
  const hopLabels = ["Nigeria", "MOVA", "Pollar", "Bolivia"];
  const hops = hopLabels.map((label, i) => ({
    label,
    active: i === activeHopIndex,
    done: i < activeHopIndex,
  }));

  return (
    <div className="flex flex-col items-center gap-12 py-12 text-center">
      <BigAmount currencySymbol={draft.sourceCurrency} amount={draft.youCanSpend} size="xl" />
      <div className="w-full max-w-md">
        <RouteHops hops={hops} />
      </div>
      <p className="font-mono text-sm uppercase tracking-[0.2em] text-signal">
        {paymentState.replace(/_/g, " ")}
      </p>
      <PollarHandoffStatus handoff={pollarHandoff} />
      <RealSendStatus send={realSend} />
    </div>
  );
}

/** The client-signed leg: only runs when a wallet is connected. Distinct
 * from PollarHandoffStatus, which is the server-side wallet creation — this
 * is the actual payment operation, built -> signed -> submitted by the
 * connected wallet, never by MOVA's backend. */
function RealSendStatus({ send }: { send: RealSend }) {
  if (send.status === "idle" || send.status === "skipped") return null;
  if (send.status === "sending") {
    return <p className="text-xs text-mist">Signing and submitting {send.amount} XLM…</p>;
  }
  if (send.status === "error") {
    return <p className="text-xs text-err">The connected wallet's send failed or was declined.</p>;
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-ok">Sent {send.amount} XLM from your connected wallet, real testnet transfer</p>
      {send.hash ? (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${send.hash}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-signal underline underline-offset-2"
        >
          View transaction →
        </a>
      ) : null}
    </div>
  );
}

/** Shows the real (or honestly-labeled simulated) Pollar hand-off as it
 * resolves — this is the actual PollarSettlementAdapter call, not a
 * decorative status line. See app/api/pollar-handoff/route.ts. */
function PollarHandoffStatus({ handoff }: { handoff: PollarHandoff }) {
  if (handoff.status === "idle" || handoff.status === "loading") {
    return <p className="text-xs text-mist">Handing off to Pollar…</p>;
  }
  if (handoff.status === "error") {
    return <p className="text-xs text-err">Pollar hand-off request failed.</p>;
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <CapabilityBadge capability={handoff.capability ?? "MOCK"} />
        <span className="text-xs text-mist">
          {handoff.real ? "Real Stellar testnet wallet via Pollar" : "Simulated Pollar wallet"}
        </span>
      </div>
      {handoff.providerRef ? (
        <p className="font-mono text-xs text-paper">{handoff.providerRef}</p>
      ) : null}
      {handoff.explorerUrl ? (
        <a
          href={handoff.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-signal underline underline-offset-2"
        >
          View on Stellar testnet explorer →
        </a>
      ) : null}
    </div>
  );
}

function ReceiptStep({
  draft,
  route,
  intentId,
  pollarHandoff,
  realSend,
}: {
  draft: DraftIntent;
  route: Route;
  intentId: string;
  pollarHandoff: PollarHandoff;
  realSend: RealSend;
}) {
  return (
    <div className="flex flex-col gap-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-ok text-ok">
        ✓
      </div>
      <h1 className="text-lg tracking-wide text-mist">PAYMENT COMPLETE</h1>

      <div>
        <p className="text-sm text-mist">{draft.recipientName.split(" ")[0]} received</p>
        <BigAmount
          currencySymbol={`${draft.destinationCurrency} `}
          amount={route.expectedReceived}
          size="xl"
        />
      </div>

      <div className="mx-auto grid grid-cols-3 gap-8">
        <Field label="You paid" value={`${draft.sourceCurrency}${draft.youCanSpend}`} />
        <Field label="Fee" value={`₦${route.fee}`} />
        <Field label="Settlement" value={formatEta(route.estimatedDurationSeconds)} />
      </div>

      <div className="mx-auto flex items-center gap-2">
        <CapabilityBadge capability="MOCK" />
        <span className="text-xs text-mist">Mock rail quote — see docs/architecture.md §8</span>
      </div>

      {pollarHandoff.status === "done" ? (
        <div className="mx-auto flex flex-col items-center gap-2 rounded-md border border-white/10 bg-panel p-4">
          <div className="flex items-center gap-2">
            <CapabilityBadge capability={pollarHandoff.capability ?? "MOCK"} />
            <span className="text-xs text-mist">Pollar hand-off</span>
          </div>
          {pollarHandoff.providerRef ? (
            <p className="font-mono text-xs text-paper">{pollarHandoff.providerRef}</p>
          ) : null}
          {pollarHandoff.explorerUrl ? (
            <a
              href={pollarHandoff.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-signal underline underline-offset-2"
            >
              View real Stellar testnet wallet →
            </a>
          ) : (
            <span className="text-xs text-mist">Simulated, see docs/pollar-integration.md</span>
          )}
        </div>
      ) : null}

      {realSend.status === "sent" ? (
        <div className="mx-auto flex flex-col items-center gap-2 rounded-md border border-ok/30 bg-panel p-4">
          <span className="text-xs text-ok">
            {realSend.amount} XLM sent from your wallet, real testnet transaction
          </span>
          {realSend.hash ? (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${realSend.hash}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-signal underline underline-offset-2"
            >
              View transaction →
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-center gap-4">
        <Link
          href={`/transactions/${intentId}`}
          className="rounded-sm border border-white/15 px-6 py-3 text-sm text-paper transition-colors hover:border-white/30"
        >
          View transaction details
        </Link>
        <Link
          href="/home"
          className="rounded-sm bg-paper px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-white"
        >
          Done
        </Link>
      </div>
    </div>
  );
}
