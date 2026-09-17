import type { Config } from "tailwindcss";

/**
 * Token names map 1:1 to docs/ui.md. One accent (signal), one warning,
 * one error — do not add more without updating that doc.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0C0E",
        panel: "#121316",
        paper: "#F4F1EC",
        mist: "#8A8F98",
        signal: "#6BD1FF",
        warn: "#E0A857",
        err: "#D9695F",
        ok: "#6FBF8C",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      spacing: {
        "18": "4.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
