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

      <HowItWorks />

      <footer className="border-t border-white/5 px-8 py-6 text-xs text-mist md:px-16">
        Local rails · MOVA · Pollar · Global
      </footer>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Say what you want",
    body: "Not the mechanics of which rail or chain to use. Just the outcome: pay Carlos at least Bs 2,000, keep the fee under ₦3,000, done in 10 minutes.",
  },
  {
    n: "02",
    title: "MOVA finds the route",
    body: "It compares bank, P2P, and stablecoin rails on fee, speed, and reliability, and throws out any route that breaks your rules, not just the cheapest option.",
  },
  {
    n: "03",
    title: "Policy checks it first",
    body: "For agent payments, a spending policy (limits, allowed destinations, human-approval threshold) is checked before anything is even quoted.",
  },
  {
    n: "04",
    title: "Pollar settles it",
    body: "This is the real part: MOVA hands the settlement leg to Pollar, which creates and funds an actual Stellar wallet on testnet.",
  },
];

function HowItWorks() {
  return (
    <section className="border-t border-white/5 px-8 py-16 md:px-16">
      <p className="text-xs uppercase tracking-[0.2em] text-mist">In plain terms</p>
      <h2 className="mt-3 max-w-xl text-2xl font-medium text-paper">
        You describe the outcome. MOVA figures out how to make it happen.
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-4">
        {STEPS.map((step) => (
          <div key={step.n} className="flex flex-col gap-2">
            <span className="font-mono text-xs text-signal">{step.n}</span>
            <h3 className="text-sm font-medium text-paper">{step.title}</h3>
            <p className="text-sm text-mist">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RouteDiagram() {
  const pathD = "M40 60 C 140 60, 140 150, 220 150 S 320 240, 360 240";
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full max-w-md" fill="none">
      {/* A quiet globe: three orbit rings, slowly rotating, centered behind
          the route. Pure SVG/CSS, no new dependency — see docs/ui.md
          "motion must explain system state," this is the one purely
          atmospheric exception, kept faint so it reads as texture, not noise. */}
      <g transform="translate(200 150)" opacity="0.35">
        <g style={{ animation: "mova-globe-spin 60s linear infinite", transformOrigin: "0px 0px" }}>
          <ellipse rx="150" ry="150" stroke="#8A8F98" strokeOpacity="0.18" />
          <ellipse rx="150" ry="60" stroke="#8A8F98" strokeOpacity="0.16" />
          <ellipse rx="150" ry="60" stroke="#8A8F98" strokeOpacity="0.16" transform="rotate(60)" />
          <ellipse rx="150" ry="60" stroke="#8A8F98" strokeOpacity="0.16" transform="rotate(120)" />
        </g>
      </g>

      <path d={pathD} stroke="url(#route-gradient)" strokeWidth="1.5" strokeDasharray="4 6" />

      {/* A particle traveling the route, looping — the one animation on
          this page that's tied to what the route actually represents. */}
      <circle r="3" className="fill-signal">
        <animateMotion dur="3.2s" repeatCount="indefinite" path={pathD} />
      </circle>

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
