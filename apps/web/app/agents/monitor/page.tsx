"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Field } from "@mova/ui";
import { TopNav } from "../../components/TopNav";

type MonitorData = {
  agentName: string;
  dailyLimit: string;
  currency: string;
  spentToday: string;
  requests: { amount: string; decision: "PASS" | "BLOCK" | "REQUIRES_APPROVAL"; reason?: string; at: string }[];
  fulfilled: number;
  blocked: number;
  pending: number;
};

const DECISION_LABEL: Record<MonitorData["requests"][number]["decision"], string> = {
  PASS: "Fulfilled",
  BLOCK: "Blocked",
  REQUIRES_APPROVAL: "Pending approval",
};

const DECISION_COLOR: Record<MonitorData["requests"][number]["decision"], string> = {
  PASS: "text-ok",
  BLOCK: "text-err",
  REQUIRES_APPROVAL: "text-warn",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/** This screen reads real history from /api/x402-demo (GET) — the same
 * route the 402 demo actually calls — instead of decorative numbers.
 * See docs/shared/gap-review.md Round 6. */
export default function AgentMonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/x402-demo")
        .then((res) => res.json())
        .then((d) => {
          if (!cancelled) setData(d);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const requests = data?.requests ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <div className="flex items-center gap-2">
          <Link href="/agents" className="text-sm text-mist hover:text-paper">
            ‹ Back
          </Link>
        </div>
        <h1 className="mt-4 text-lg tracking-wide text-mist">AGENT ACTIVITY</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-paper">
          <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-white/5 text-xs">🤖</span>
          {data?.agentName ?? "Translation Bot"}
          <span className="text-xs text-mist">· live, polls every 4s</span>
        </p>

        <div className="mt-8 grid grid-cols-3 gap-6">
          <Field label="Requests" value={String(requests.length)} />
          <Field label="Fulfilled" value={String(data?.fulfilled ?? 0)} />
          <Field label="Blocked" value={String(data?.blocked ?? 0)} />
        </div>

        <div className="mt-8">
          <span className="text-xs uppercase tracking-wider text-mist">Today's spend</span>
          <p className="mt-2 font-mono text-lg text-paper">
            ${data?.spentToday ?? "0"} / ${data?.dailyLimit ?? "200"}
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
            <div
              className="h-1.5 rounded-full bg-signal"
              style={{
                width: `${Math.min(100, (Number(data?.spentToday ?? 0) / Number(data?.dailyLimit ?? 200)) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-10">
          <span className="text-xs uppercase tracking-wider text-mist">Recent requests</span>
          {requests.length === 0 ? (
            <p className="mt-4 text-sm text-mist">
              No requests yet. Run the{" "}
              <Link href="/x402" className="text-signal underline underline-offset-2">
                402 demo
              </Link>{" "}
              to see one show up here in real time.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-white/5">
              {requests.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <span className="font-mono text-sm text-paper">{r.amount}</span>
                  <span className={`text-xs ${DECISION_COLOR[r.decision]}`}>{DECISION_LABEL[r.decision]}</span>
                  <span className="text-xs text-mist">{timeAgo(r.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
