// FILE: src/lib/utils/tokens.ts

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: JS-readable tokens keep runtime-only UI such as charts, generated
 * SVGs, and animation helpers aligned with the Tailwind/CSS token contract.
 */
export const WA_COLORS = {
  blue600: "#1A56FF",
  blue50: "#EBF0FF",
  blue100: "#C7D7FE",
  blue800: "#0C447C",
  blue900: "#042C53",
  gray0: "#FFFFFF",
  gray50: "#F7F7F8",
  gray100: "#EFEFEF",
  gray200: "#D4D4D8",
  gray400: "#A0A0A0",
  gray600: "#5C5C5C",
  gray800: "#1A1A1A",
  gray900: "#0D0D0D",
  success: "#1A7A4A",
  successBg: "#E8F5EE",
  warning: "#A05C00",
  warningBg: "#FFF4E0",
  error: "#C0392B",
  errorBg: "#FDECEA",
} as const;

export const WA_SPACING = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
} as const;

export const WA_RADIUS = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  full: "9999px",
} as const;

export const WA_DURATION = {
  instant: "80ms",
  fast: "150ms",
  normal: "250ms",
  slow: "400ms",
} as const;
