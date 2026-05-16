import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Exclude E2E tests (Playwright owns those) and Next build output
    exclude: ["node_modules", ".next", "dist", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Scope to the pure-logic surface that unit tests target. React components,
      // the Zustand store, and server-only providers are exercised by the
      // Playwright E2E suite (separate process — v8 can't instrument across it).
      include: [
        "lib/dedupe.ts",
        "lib/youtube-id.ts",
        "lib/flow-prompt.ts",
        "lib/utils.ts",
        "lib/project-config.ts",
        "lib/prompts/script-user.ts",
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
