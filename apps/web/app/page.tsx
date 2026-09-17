import Link from "next/link";
import { TopNav } from "./components/TopNav";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav cta={false} />

      <main className="grid flex-1 grid-cols-1 items-center gap-16 px-8 py-16 md:grid-cols-2 md:px-16">
        <div className="max-w-md">
          <h1 className="text-5xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            Payments,
            <br />
            without the routing
            <br />
            problem.
          </h1>
          <p className="mt-6 max-w-sm text-base text-mist">
            MOVA turns payment intent into executable cross-border settlement.
          </p>
          <div className="mt-10 flex gap-4">
            <Link
              href="/pay"
              className="rounded-sm bg-paper px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-white"
            >
              Create payment
            </Link>
            <Link
              href="/operator"
              className="rounded-sm border border-white/15 px-6 py-3 text-sm text-paper transition-colors hover:border-white/30"
            >
              Explore system
            </Link>
          </div>
        </div>

        <div className="relative flex h-72 items-center justify-center md:h-96">
          <RouteDiagram />
        </div>
      </main>

      <footer className="border-t border-white/5 px-8 py-6 text-xs text-mist md:px-16">
        Local rails · MOVA · Pollar · Global
      </footer>
    </div>
  );
}

function RouteDiagram() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full max-w-md" fill="none">
      <path
        d="M40 60 C 140 60, 140 150, 220 150 S 320 240, 360 240"
        stroke="url(#route-gradient)"
        strokeWidth="1.5"
        strokeDasharray="4 6"
      />
      <circle cx="40" cy="60" r="5" className="fill-signal" />
      <text x="20" y="42" className="fill-mist text-[10px] uppercase tracking-wider">
        NG
      </text>
      <circle cx="220" cy="150" r="6" className="fill-paper">
        <animate attributeName="r" values="5;8;5" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <text x="200" y="132" className="fill-paper text-[10px] uppercase tracking-wider">
        MOVA
      </text>
      <circle cx="300" cy="215" r="4" className="fill-mist" />
      <text x="280" y="197" className="fill-mist text-[10px] uppercase tracking-wider">
        Pollar
      </text>
      <circle cx="360" cy="240" r="5" className="fill-warn" />
      <text x="345" y="262" className="fill-mist text-[10px] uppercase tracking-wider">
        BO
      </text>
      <defs>
        <linearGradient id="route-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6BD1FF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#E0A857" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
