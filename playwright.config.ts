import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const HOST = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: HOST,
    trace: "on-first-retry",
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Reuse a running dev server if present, otherwise spin one up.
  // IMPORTANT: bind the dev server to the SAME port the config polls — bare
  // `next dev` picks 3000/first-free, but `url` is :${PORT}, so on CI (where
  // there's no pre-running server) Playwright would wait forever. Pass the
  // port explicitly and give Next 16's first compile a generous timeout.
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: HOST,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
