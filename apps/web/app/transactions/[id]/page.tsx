"use client";

import { use, useEffect, useState } from "react";
import { CapabilityBadge, Field } from "@mova/ui";
import { TopNav } from "../../components/TopNav";
import { loadTransaction, routeLabel, type PersistedTransaction } from "../../pay/intentMath";

const STATE_TRANSITIONS = [
  { label: "Created", at: "" },
  { label: "Quoted", at: "" },
  { label: "Authorized", at: "" },
  { label: "Settling", at: "" },
  { label: "Completed", at: "" },
];

export default function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tx, setTx] = useState<PersistedTransaction | null>(null);

  useEffect(() => {
    setTx(loadTransaction(id));
  }, [id]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-lg tracking-wide text-mist">Transaction details</h1>
          <span className="rounded-sm bg-ok/15 px-2 py-1 text-xs uppercase tracking-wider text-ok">
            Completed
          </span>
        </div>

        {!tx ? (
          <p className="text-sm text-mist">
            No local record for this transaction — session data doesn't persist across a full
            reload. Complete a payment at <code className="font-mono">/pay</code> to see this
            screen populated.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6 rounded-md border border-white/10 bg-panel p-6 md:grid-cols-3">
              <Field label="Intent ID" value={tx.intentId} />
              <Field label="Route" value={routeLabel(tx.route)} mono={false} />
              <Field label="Quote expiry" value="60s from quote" />
              <Field label="Fee" value={`₦${tx.route.fee}`} />
              <Field label="Exchange rate" value="1 BOB ≈ 0.145 NGN (illustrative)" mono={false} />
              <Field label="Provider" value="mock-ngn-bank / demo-stablecoin" mono={false} />
            </div>

            <div className="mt-8">
              <span className="text-xs uppercase tracking-wider text-mist">State transitions</span>
              <div className="mt-4 flex items-center justify-between">
                {STATE_TRANSITIONS.map((s, i) => (
                  <div key={s.label} className="flex flex-col items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-ok" />
                    <span className="text-[11px] uppercase tracking-wider text-mist">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2">
              <CapabilityBadge capability="MOCK" />
              <span className="text-xs text-mist">Bank / P2P rails</span>
              <CapabilityBadge capability="SEMI_MANUAL" />
              <span className="text-xs text-mist">Pollar BOB settlement leg</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
