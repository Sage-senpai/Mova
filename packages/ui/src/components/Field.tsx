/** A sparse label/value pair — see docs/ui.md "cards should be sparse." */
export function Field({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.14em] text-mist">{label}</span>
      <span className={`text-lg text-paper ${mono ? "font-mono tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}
