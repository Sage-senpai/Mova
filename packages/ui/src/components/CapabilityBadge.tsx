export type Capability = "REAL" | "SANDBOX" | "MOCK" | "SEMI_MANUAL" | "FUTURE";

const dotClass: Record<Capability, string> = {
  REAL: "bg-ok",
  SANDBOX: "bg-signal",
  MOCK: "bg-mist",
  SEMI_MANUAL: "bg-warn",
  FUTURE: "bg-mist/50",
};

const label: Record<Capability, string> = {
  REAL: "Real",
  SANDBOX: "Sandbox",
  MOCK: "Mock",
  SEMI_MANUAL: "Semi-manual",
  FUTURE: "Future",
};

/**
 * Every rail/provider must declare a capability level and it must be
 * visible, never buried — see docs/security.md §honesty.
 */
export function CapabilityBadge({ capability }: { capability: Capability }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-mist">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass[capability]}`} aria-hidden />
      {label[capability]}
    </span>
  );
}
