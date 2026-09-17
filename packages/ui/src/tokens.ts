/**
 * Design tokens — see docs/ui.md. One accent, one warning, one error.
 * Do not add new colors here without a corresponding update to that doc.
 */
export const color = {
  bg: "#0B0C0E",
  surface: "#121316",
  textPrimary: "#F4F1EC",
  textSecondary: "#8A8F98",
  signal: "#6BD1FF",
  warning: "#E0A857",
  error: "#D9695F",
  success: "#6FBF8C",
} as const;

/** 8px base unit. Prefer these over arbitrary spacing values. */
export const space = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
  xxxl: 96,
} as const;

export const radius = {
  sharp: 0,
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

/** Capability -> visual treatment, used on Screens 08 and 12. */
export const capabilityColor: Record<
  "REAL" | "SANDBOX" | "MOCK" | "SEMI_MANUAL" | "FUTURE",
  string
> = {
  REAL: color.success,
  SANDBOX: color.signal,
  MOCK: color.textSecondary,
  SEMI_MANUAL: color.warning,
  FUTURE: color.textSecondary,
};
