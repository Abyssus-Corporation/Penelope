import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const systemChrome = "/usr/bin/google-chrome";
// Local fallback only: if Playwright's Chromium is not installed, use the
// machine Chrome so `pnpm test:e2e` still runs.
const useSystemChrome = !isCI && existsSync(systemChrome);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    ...(useSystemChrome ? { channel: "chrome" as const } : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
