import Link from "next/link";
import { Field } from "@mova/ui";
import { TopNav } from "../components/TopNav";

export default function AgentsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="text-lg tracking-wide text-mist">AGENT</h1>

        <div className="mt-6 rounded-md border border-white/10 bg-panel p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-white/5 text-sm">
                🤖
              </div>
              <span className="text-base text-paper">Translation Bot</span>
            </div>
            <span className="rounded-sm bg-ok/15 px-2 py-1 text-[10px] uppercase tracking-wider text-ok">
              Active
            </span>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6">
            <Field label="Can spend" value="$200 / day" />
            <Field label="Per payment" value="$50 max" />
            <Field label="Human approval" value="Above $25" />
            <Field label="Allowed" value="🇳🇬 → 🇧🇴" mono={false} />
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
            <Link href="#" className="text-sm text-mist transition-colors hover:text-paper">
              Edit policy
            </Link>
            <Link href="/agents/monitor" className="text-sm text-signal transition-colors hover:text-paper">
              View activity →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
