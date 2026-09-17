"use client";

import { useState } from "react";
import { TopNav } from "../components/TopNav";

type Phase = "idle" | "requesting" | "402" | "policy" | "intent" | "route" | "pollar" | "done" | "blocked";

const SEQUENCE: Phase[] = ["requesting", "402", "policy", "intent", "route", "pollar", "done"];

export default function X402DemoPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<unknown>(null);

  async function run() {
    setResult(null);
    for (const step of SEQUENCE.slice(0, 2)) {
      setPhase(step);
      await sleep(500);
    }

    const first = await fetch("/api/x402-demo", { method: "POST" });
    if (first.status !== 402) return;

    for (const step of SEQUENCE.slice(2)) {
      setPhase(step);
      await sleep(450);
    }

    const second = await fetch("/api/x402-demo", {
      method: "POST",
      headers: { "PAYMENT-SIGNATURE": "demo-signed-payload" },
    });
    const body = await second.json();
    setResult(body);
    setPhase(second.status === 200 ? "done" : "blocked");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-center">
        <h1 className="text-lg tracking-wide text-mist">API REQUEST</h1>

        <div className="mt-8 rounded-md border border-white/10 bg-panel p-8">
          <p className="font-mono text-xs text-mist">GET /v1/translate</p>
          <p className="mt-4 text-3xl text-paper">402 Payment Required</p>
          <p className="font-mono text-lg text-warn">$0.20</p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          {["402", "MOVA", "Policy check", "Intent", "Route", "Pollar", "200 OK"].map((label, i) => {
            const stepKeys: Phase[] = ["402", "402", "policy", "intent", "route", "pollar", "done"];
            const isActive = phase === stepKeys[i];
            const isDone = SEQUENCE.indexOf(phase) > SEQUENCE.indexOf(stepKeys[i] ?? "idle");
            return (
              <div key={label} className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isActive ? "animate-pulse bg-signal" : isDone ? "bg-ok" : "bg-mist/30"
                  }`}
                />
                <span className={`text-sm ${isActive ? "text-paper" : "text-mist"}`}>{label}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={run}
          disabled={phase !== "idle" && phase !== "done" && phase !== "blocked"}
          className="mt-10 rounded-sm bg-paper px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-white disabled:opacity-40"
        >
          Simulate agent request
        </button>

        {result ? (
          <pre className="mt-6 overflow-auto rounded-sm bg-black/30 p-4 text-left font-mono text-xs text-mist">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}
      </main>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
