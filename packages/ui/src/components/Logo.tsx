/** The MOVA mark: a route line between an origin, MOVA, and a destination
 * node — the same motif as the landing page's route diagram, at icon
 * scale. Matches apps/web/app/icon.svg (kept in sync manually). */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <rect width="64" height="64" rx="10" fill="#0B0C0E" />
      <line
        x1="14"
        y1="50"
        x2="50"
        y2="14"
        stroke="#8A8F98"
        strokeWidth="2"
        strokeDasharray="1 5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="50" r="4.5" fill="#8A8F98" />
      <circle cx="32" cy="32" r="5.5" fill="#F4F1EC" />
      <circle cx="50" cy="14" r="4.5" fill="#6BD1FF" />
    </svg>
  );
}
