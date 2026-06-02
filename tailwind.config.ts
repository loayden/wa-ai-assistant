// FILE: tailwind.config.ts
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/*
 * [ROLE: ARCHITECT]
 * Decision: The content globs cover the App Router, shared components, hooks,
 * and library files so Tailwind can tree-shake all class usage generated across
 * the requested SaaS folder structure.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wa: {
          "blue-600": "#1A56FF",
          "blue-50": "#EBF0FF",
          "blue-100": "#C7D7FE",
          "blue-800": "#0C447C",
          "blue-900": "#042C53",
          "gray-0": "#FFFFFF",
          "gray-50": "#F7F7F8",
          "gray-100": "#EFEFEF",
          "gray-200": "#D4D4D8",
          "gray-400": "#A0A0A0",
          "gray-600": "#5C5C5C",
          "gray-800": "#1A1A1A",
          "gray-900": "#0D0D0D",
          success: "#1A7A4A",
          "success-bg": "#E8F5EE",
          warning: "#A05C00",
          "warning-bg": "#FFF4E0",
          error: "#C0392B",
          "error-bg": "#FDECEA",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "wa-xs": "4px",
        "wa-sm": "8px",
        "wa-md": "12px",
        "wa-lg": "16px",
        "wa-xl": "20px",
        "wa-full": "9999px",
      },
      boxShadow: {
        "wa-1": "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "wa-2": "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)",
        "wa-3": "0 16px 48px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        display: ["40px", { lineHeight: "1.10", letterSpacing: "0em" }],
        h1: ["28px", { lineHeight: "1.20", letterSpacing: "0em" }],
        h2: ["22px", { lineHeight: "1.25", letterSpacing: "0em" }],
        h3: ["18px", { lineHeight: "1.30", letterSpacing: "0em" }],
        "body-lg": ["17px", { lineHeight: "1.60", letterSpacing: "0em" }],
        body: ["15px", { lineHeight: "1.60", letterSpacing: "0em" }],
        "body-sm": ["13px", { lineHeight: "1.50", letterSpacing: "0em" }],
        label: ["11px", { lineHeight: "1.20", letterSpacing: "0em" }],
        micro: ["10px", { lineHeight: "1.20", letterSpacing: "0em" }],
        mono: ["14px", { lineHeight: "1.40", letterSpacing: "0em" }],
      },
      keyframes: {
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(6px)" },
          "75%": { transform: "translateX(-6px)" },
        },
        "pulse-dot": {
          "0%,100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.5)" },
        },
        "ring-pulse": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "slide-up": "slide-up 250ms cubic-bezier(0.0,0.0,0.2,1)",
        "fade-in": "fade-in 250ms cubic-bezier(0.0,0.0,0.2,1)",
        shake: "shake 250ms linear",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "ring-pulse": "ring-pulse 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
