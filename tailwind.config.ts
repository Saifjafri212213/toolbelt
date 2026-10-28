import type { Config } from "tailwindcss";

// Tailwind 3 cannot put an opacity on a var() colour, so `border-[var(--rose)]/30` builds no CSS at all and the
// box falls back to the default grey border with no tint. `border-tint-rose-30` and `bg-tint-rose-5` mix the
// accent with transparent instead (the accent itself follows the theme). For another percentage, add it to TINT_STEPS.
const TINT_ACCENTS = ["cyan", "amber", "rose", "violet", "sky", "lime", "green", "fuchsia"] as const;
const TINT_STEPS = [5, 10, 30, 40] as const;
const tint = Object.fromEntries(
  TINT_ACCENTS.map((accent) => [
    accent,
    Object.fromEntries(TINT_STEPS.map((step) => [step, `color-mix(in srgb, var(--${accent}) ${step}%, transparent)`])),
  ]),
);

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07080B",
          900: "#0A0B0F",
          850: "#0E1016",
          800: "#13151C",
          750: "#171A23",
          700: "#1C1F2A",
          600: "#262A38",
          500: "#363B4C",
          400: "#575E75",
          300: "#8289A0",
          200: "#B4B9CA",
          100: "#DDE0EA",
          50: "#E8E6E1",
        },
        tint,
        accent: {
          cyan: "#00E5C7",
          amber: "#FFB547",
          rose: "#FF4D6D",
          violet: "#9E7BFF",
          sky: "#5AB5FF",
          lime: "#A6F36B",
          green: "#3FDD6B",
          fuchsia: "#F26DF0",
        },
      },
      fontFamily: {
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["var(--font-plex-mono)", "var(--font-jetbrains)", "ui-monospace", "monospace"],
        sans: ["var(--font-plex-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        reveal: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(0,229,199,0.35)" },
          "50%": { boxShadow: "0 0 24px 4px rgba(0,229,199,0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 260ms cubic-bezier(.22,.61,.36,1)",
        "slide-down": "slide-down 260ms cubic-bezier(.22,.61,.36,1)",
        shake: "shake 380ms cubic-bezier(.36,.07,.19,.97)",
        reveal: "reveal 420ms cubic-bezier(.22,.61,.36,1) both",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
