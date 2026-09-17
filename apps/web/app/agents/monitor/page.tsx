import Link from "next/link";
import { Field } from "@mova/ui";
import { TopNav } from "../../components/TopNav";

const requests = [
  { amount: "$0.20", status: "Fulfilled" as const, time: "2m ago" },
  { amount: "$0.50", status: "Fulfilled" as const, time: "15m ago" },
  { amount: "$1.20", status: "Fulfilled" as const, time: "32m ago" },
  { amount: "$0.30", status: "Blocked" as const, time: "1h ago" },
];

const statusColor: Record<(typeof requests)[number]["status"], string> = {
  Fulfilled: "text-ok",
  Blocked: "text-err",
};

export default function AgentMonitorPage() {
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
          Translation Bot
        </p>

        <div className="mt-8 grid grid-cols-3 gap-6">
          <Field label="Requests" value="12" />
          <Field label="Fulfilled" value="11" />
          <Field label="Blocked" value="1" />
        </div>

        <div className="mt-8">
          <span className="text-xs uppercase tracking-wider text-mist">Today's spend</span>
          <p className="mt-2 font-mono text-lg text-paper">$3.80 / $200</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
            <div className="h-1.5 rounded-full bg-signal" style={{ width: "2%" }} />
          </div>
        </div>

        <div className="mt-10">
          <span className="text-xs uppercase tracking-wider text-mist">Recent requests</span>
          <ul className="mt-4 divide-y divide-white/5">
            {requests.map((r, i) => (
              <li key={i} className="flex items-center justify-between py-3">
                <span className="font-mono text-sm text-paper">{r.amount}</span>
                <span className={`text-xs ${statusColor[r.status]}`}>{r.status}</span>
                <span className="text-xs text-mist">{r.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
