// FILE: vitest.config.ts
/*
 * [ROLE: QA ENGINEER]
 * Decision: Vitest mirrors the Next TypeScript alias and uses jsdom so hooks
 * and client-side validators can run in a browser-like test environment.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/setup/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
