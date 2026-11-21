import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const isCI = Boolean(process.env.CI);
const previewPort = Number(process.env.PREVIEW_PORT || 4173);
const previewOrigin = `http://127.0.0.1:${previewPort}`;
// Only reuse a running preview when the operator asks for it.
const reuseExistingServer = process.env.PW_REUSE_SERVER === "1";
// Locally, reuse an installed Chrome if there is one. CI always uses Playwright's
// bundled Chromium (installed by the workflow), so runs are reproducible.
const systemChrome = isCI
  ? undefined
  : existsSync("/usr/bin/google-chrome")
    ? "/usr/bin/google-chrome"
    : existsSync("/usr/bin/google-chrome-stable")
      ? "/usr/bin/google-chrome-stable"
      : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL: previewOrigin,
    trace: "on-first-retry",
    ...(systemChrome ? { launchOptions: { executablePath: systemChrome } } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // In CI the web job already built `dist`. Locally, build first unless a
    // preview is reused via PW_REUSE_SERVER=1.
    command: isCI
      ? `pnpm preview --host 127.0.0.1 --port ${previewPort} --strictPort`
      : `pnpm build && pnpm preview --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: previewOrigin,
    reuseExistingServer,
    timeout: 120_000,
  },
});
