import Link from "next/link";
import { BigAmount } from "@mova/ui";
import { TopNav } from "../components/TopNav";

const recent = [
  { name: "Carlos Mendoza", amount: "Bs 2,041", status: "Completed" as const, time: "4m ago" },
  { name: "Maria Lopez", amount: "Bs 840", status: "Completed" as const, time: "12m ago" },
  { name: "Juan Perez", amount: "Bs 1,230", status: "Pending" as const, time: "18m ago" },
];

const statusColor: Record<(typeof recent)[number]["status"], string> = {
  Completed: "text-ok",
  Pending: "text-warn",
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1 px-8 py-10 md:px-16">
        <p className="text-sm text-mist">Good morning, Alex</p>
        <h1 className="mt-1 text-2xl text-paper">Your payment infrastructure, orchestrated.</h1>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-panel p-6 md:col-span-1">
            <BigAmount label="Available to route" currencySymbol="₦" amount="184,520" size="md" />
            <p className="mt-2 text-xs text-ok">+12% today</p>
            <Link
              href="/pay"
              className="mt-6 inline-block w-full rounded-sm bg-paper px-4 py-2.5 text-center text-sm font-medium text-ink transition-colors hover:bg-white"
            >
              Create payment
            </Link>
          </div>

          <div className="rounded-md border border-white/10 bg-panel p-6 md:col-span-2">
            <span className="text-xs uppercase tracking-wider text-mist">Recent</span>
            <ul className="mt-4 divide-y divide-white/5">
              {recent.map((r) => (
                <li key={r.name} className="flex items-center justify-between py-3">
                  <span className="text-sm text-paper">{r.name}</span>
                  <span className="font-mono text-sm text-paper">{r.amount}</span>
                  <span className={`text-xs ${statusColor[r.status]}`}>{r.status}</span>
                  <span className="text-xs text-mist">{r.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
