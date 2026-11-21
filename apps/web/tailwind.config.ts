import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        // Touch-first input: bump input text to 16px so iOS does not zoom on focus.
        coarse: { raw: "(pointer: coarse)" },
      },
      gridTemplateColumns: {
        // Project grid: as many columns as fit, never narrower than the card minimum.
        "cards-sm": "repeat(auto-fill, minmax(min(100%, 14rem), 1fr))",
        "cards-md": "repeat(auto-fill, minmax(min(100%, 18rem), 1fr))",
        "cards-lg": "repeat(auto-fill, minmax(min(100%, 26rem), 1fr))",
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
        mono: ["Obel Mono", "monospace"],
        display: ["Newsreader Variable", "Newsreader", "Georgia", "serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        // Dialog content is centered with translate(-50%, -50%), so keep it in the keyframes.
        "dialog-in": {
          from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.97)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "dialog-out": {
          from: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          to: { opacity: "0", transform: "translate(-50%, -48%) scale(0.97)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(16px)" },
        },
        "step-forward": {
          from: { opacity: "0", transform: "translateX(20px)" },
        },
        "step-back": {
          from: { opacity: "0", transform: "translateX(-20px)" },
        },
        "drawer-in": {
          from: { transform: "translateX(-100%)" },
        },
        "drawer-out": {
          to: { transform: "translateX(-100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 150ms ease-in",
        "dialog-in": "dialog-in 200ms cubic-bezier(0.16,1,0.3,1)",
        "dialog-out": "dialog-out 150ms ease-in",
        rise: "rise 900ms cubic-bezier(0.16,1,0.3,1) both",
        "step-forward": "step-forward 380ms cubic-bezier(0.16,1,0.3,1) both",
        "step-back": "step-back    380ms cubic-bezier(0.16,1,0.3,1) both",
        "drawer-in": "drawer-in 280ms var(--ease-drawer)",
        "drawer-out": "drawer-out 200ms var(--ease-drawer)",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        // Skip layout and paint for off-screen items in long lists.
        ".content-auto": {
          "content-visibility": "auto",
          "contain-intrinsic-size": "auto 8rem",
        },
      });
    }),
  ],
} satisfies Config;
