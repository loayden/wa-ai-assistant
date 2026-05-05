// FILE: postcss.config.mjs
/*
 * [ROLE: ARCHITECT]
 * Decision: Tailwind v3 uses the stable `tailwindcss` and `autoprefixer`
 * PostCSS plugins, which keeps this Next.js 14 scaffold aligned with the
 * package versions that existed in 2024.
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
