type BigAmountProps = {
  currencySymbol: string;
  amount: string;
  label?: string;
  size?: "md" | "lg" | "xl";
};

const sizeClass: Record<NonNullable<BigAmountProps["size"]>, string> = {
  md: "text-4xl",
  lg: "text-6xl",
  xl: "text-7xl md:text-8xl",
};

/**
 * A monetary amount that visually dominates its label — see docs/ui.md
 * "large numbers should feel like financial instrumentation."
 */
export function BigAmount({ currencySymbol, amount, label, size = "lg" }: BigAmountProps) {
  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <span className="text-xs uppercase tracking-[0.18em] text-mist">{label}</span>
      ) : null}
      <span className={`font-mono font-medium tabular-nums text-paper ${sizeClass[size]}`}>
        {currencySymbol}
        {amount}
      </span>
    </div>
  );
}
