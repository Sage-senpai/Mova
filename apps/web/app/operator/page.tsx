import { CapabilityBadge } from "@mova/ui";
import { TopNav } from "../components/TopNav";

const africanRails = [
  { name: "Bank", availability: "98%", latency: "120ms", failures: 0, capability: "MOCK" as const },
  { name: "P2P", availability: "96%", latency: "210ms", failures: 1, capability: "MOCK" as const },
  { name: "Stablecoin", availability: "99%", latency: "180ms", failures: 0, capability: "MOCK" as const },
];

const globalRails = [
  { name: "Bank (BO)", availability: "97%", latency: "320ms", failures: 0, capability: "SEMI_MANUAL" as const },
  { name: "P2P (BO)", availability: "94%", latency: "410ms", failures: 2, capability: "SEMI_MANUAL" as const },
  { name: "Stablecoin (BO)", availability: "98%", latency: "250ms", failures: 1, capability: "SANDBOX" as const },
];

export default function OperatorPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav cta={false} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-lg tracking-wide text-mist">Network overview</h1>
          <span className="text-xs text-mist">Last quote 2m ago</span>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <RailColumn title="African rails" rails={africanRails} />
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <span className="rounded-sm border border-signal px-4 py-2 text-sm text-signal">MOVA</span>
            <span className="text-xs text-mist">↓</span>
            <span className="rounded-sm border border-white/15 px-4 py-2 text-sm text-paper">Pollar</span>
          </div>
          <RailColumn title="Global destinations" rails={globalRails} />
        </div>

        <div className="mt-12">
          <div className="flex items-center justify-between text-sm">
            <span className="text-mist">Overall health</span>
            <span className="font-mono text-paper">97%</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
            <div className="h-1.5 rounded-full bg-ok" style={{ width: "97%" }} />
          </div>
        </div>
      </main>
    </div>
  );
}

function RailColumn({
  title,
  rails,
}: {
  title: string;
  rails: { name: string; availability: string; latency: string; failures: number; capability: "MOCK" | "SEMI_MANUAL" | "SANDBOX" }[];
}) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wider text-mist">{title}</span>
      <ul className="mt-4 flex flex-col gap-4">
        {rails.map((r) => (
          <li key={r.name} className="rounded-md border border-white/10 bg-panel p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-paper">{r.name}</span>
              <CapabilityBadge capability={r.capability} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-mist">
              <span>{r.availability}</span>
              <span>{r.latency}</span>
              <span>{r.failures} failures</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
