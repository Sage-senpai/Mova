export type Hop = {
  label: string;
  active?: boolean;
  done?: boolean;
};

/**
 * Horizontal route visualization: NG -> MOVA -> Pollar -> BO. `active`
 * hop pulses; hops before it read as done. This is the shape motion
 * described in docs/ui.md attaches meaning to — it must reflect real
 * payment.state, never animate independent of it.
 */
export function RouteHops({ hops }: { hops: Hop[] }) {
  return (
    <div className="flex w-full items-center">
      {hops.map((hop, i) => (
        <div key={hop.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <span
              className={[
                "h-2.5 w-2.5 rounded-full border",
                hop.active
                  ? "border-signal bg-signal animate-pulse"
                  : hop.done
                    ? "border-ok bg-ok"
                    : "border-mist/40 bg-transparent",
              ].join(" ")}
              aria-hidden
            />
            <span className="whitespace-nowrap text-[11px] uppercase tracking-wider text-mist">
              {hop.label}
            </span>
          </div>
          {i < hops.length - 1 ? (
            <div
              className={[
                "mx-2 h-px flex-1",
                hop.done ? "bg-ok/60" : "bg-mist/20",
              ].join(" ")}
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
