import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test, type Page, type Request } from "@playwright/test";
import {
  CACHE_CONTROL_ERROR,
  CACHE_CONTROL_HTML,
  CACHE_CONTROL_IMMUTABLE,
  CONTENT_SECURITY_POLICY,
  PREVIEW_SECURITY_HEADERS,
} from "../security-headers";

const BASE = new URL(
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${process.env.PREVIEW_PORT || 4173}`,
);

test.use({ storageState: { cookies: [], origins: [] } });

const PUBLIC_PATHS = ["/login", "/signup"] as const;
const AUTHED_PATH = "/dashboard";
// Client-side routes added after #9; the preview server falls back to index.html for each.
// Production builds ship no mock API, so every project route shows the unavailable state.
const NEW_SCREENS = [
  { path: "/projects/acme-production", heading: "Project data isn't available" },
  { path: "/forgot-password", heading: "Reset your password, we'll email you a link." },
  { path: "/this-route-does-not-exist", heading: "Page not found" },
] as const;

type CspViolation = {
  blockedURI: string;
  violatedDirective: string;
  effectiveDirective: string;
  disposition: string;
  originalPolicy: string;
};

async function collectPageSignals(page: Page, origin: string = BASE.origin) {
  const thirdParty: Request[] = [];
  const violations: CspViolation[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) {
      thirdParty.push(request);
    }
  });

  await page.addInitScript(() => {
    const bag = ((window as unknown as { __cspViolations?: CspViolation[] }).__cspViolations = []);
    document.addEventListener("securitypolicyviolation", (event) => {
      bag.push({
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        effectiveDirective: event.effectiveDirective,
        disposition: event.disposition,
        originalPolicy: event.originalPolicy,
      });
    });
  });

  return {
    thirdParty,
    async readViolations() {
      violations.push(
        ...((await page.evaluate(
          () => (window as unknown as { __cspViolations?: CspViolation[] }).__cspViolations ?? [],
        )) ?? []),
      );
      return violations;
    },
  };
}

function assertNoSecurityViolations(violations: CspViolation[]) {
  expect(
    violations,
    `securitypolicyviolation events: ${JSON.stringify(violations, null, 2)}`,
  ).toEqual([]);
}

async function expectSecurityHeaders(path: string) {
  const response = await fetch(new URL(path, BASE));
  expect(response.ok, `${path} should be 200`).toBe(true);
  for (const [name, value] of Object.entries(PREVIEW_SECURITY_HEADERS)) {
    expect(response.headers.get(name.toLowerCase()), `${path} ${name}`).toBe(value);
  }
  expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
  expect(response.headers.get("content-security-policy-report-only")).toBeNull();
  expect(response.headers.get("strict-transport-security")).toBeNull();
  expect(response.headers.get("cache-control")).toBe(CACHE_CONTROL_HTML);
}

test.describe("security headers on the preview server", () => {
  test("login, signup, and dashboard HTML carry the production headers", async () => {
    await expectSecurityHeaders("/login");
    await expectSecurityHeaders("/signup");
    await expectSecurityHeaders("/dashboard");
    for (const { path } of NEW_SCREENS) await expectSecurityHeaders(path);
  });

  test("hashed assets are immutable; a missing asset is 404 with no-store", async () => {
    const index = await fetch(new URL("/", BASE));
    const html = await index.text();
    const asset = html.match(/\/assets\/[^"' ]+\.js/);
    expect(asset, "built HTML should reference a hashed /assets/*.js file").not.toBeNull();
    const assetResponse = await fetch(new URL(asset![0], BASE));
    expect(assetResponse.ok).toBe(true);
    expect(assetResponse.headers.get("cache-control")).toBe(CACHE_CONTROL_IMMUTABLE);
    for (const [name, value] of Object.entries(PREVIEW_SECURITY_HEADERS)) {
      expect(assetResponse.headers.get(name.toLowerCase()), `asset ${name}`).toBe(value);
    }

    const missing = await fetch(new URL("/assets/missing-asset-does-not-exist.js", BASE));
    expect(missing.status).toBe(404);
    const body = await missing.text();
    expect(body).not.toMatch(/<!doctype html>/i);
    expect(missing.headers.get("cache-control")).toBe(CACHE_CONTROL_ERROR);
    for (const [name, value] of Object.entries(PREVIEW_SECURITY_HEADERS)) {
      expect(missing.headers.get(name.toLowerCase()), `404 asset ${name}`).toBe(value);
    }
  });

  test("font licenses are served; a missing /fonts/ file is 404, not the SPA", async () => {
    for (const name of ["Inter-OFL.txt", "Newsreader-OFL.txt", "ObelMono-OFL.txt"]) {
      const license = await fetch(new URL(`/fonts/${name}`, BASE));
      expect(license.status, name).toBe(200);
      expect(license.headers.get("content-type"), name).toMatch(/^text\/plain/);
      expect(await license.text(), name).toContain("SIL OPEN FONT LICENSE");
    }

    const missing = await fetch(new URL("/fonts/x.woff2", BASE));
    expect(missing.status).toBe(404);
    expect(await missing.text()).not.toMatch(/<!doctype html>/i);
    expect(missing.headers.get("cache-control")).toBe(CACHE_CONTROL_ERROR);
    for (const [name, value] of Object.entries(PREVIEW_SECURITY_HEADERS)) {
      expect(missing.headers.get(name.toLowerCase()), `404 font ${name}`).toBe(value);
    }
  });
});

test.describe("pages under the production CSP", () => {
  for (const path of PUBLIC_PATHS) {
    test(`${path} has no CSP violations and no third-party requests`, async ({ page }) => {
      const signals = await collectPageSignals(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(250);
      assertNoSecurityViolations(await signals.readViolations());
      expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
    });
  }

  for (const { path, heading } of NEW_SCREENS) {
    test(`${path} renders with no CSP violations and no third-party requests`, async ({ page }) => {
      const signals = await collectPageSignals(page);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await page.waitForTimeout(250);
      assertNoSecurityViolations(await signals.readViolations());
      expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
    });
  }

  test("a saved dark theme is set before the first frame, with no CSP violations", async ({
    page,
  }) => {
    const signals = await collectPageSignals(page);
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
      // The first animation frame callback runs before the first frame is painted.
      requestAnimationFrame(() => {
        (window as unknown as { __firstFrameDark?: boolean }).__firstFrameDark =
          document.documentElement.classList.contains("dark");
      });
    });
    for (const path of ["/login", "/this-route-does-not-exist", AUTHED_PATH]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveClass(/\bdark\b/);
      const firstFrameDark = await page.evaluate(
        () => (window as unknown as { __firstFrameDark?: boolean }).__firstFrameDark,
      );
      expect(firstFrameDark, `${path}: html.dark at the first frame`).toBe(true);
    }

    // Same-origin, stable path: revalidated on each load (no-cache), served as JavaScript.
    const script = await fetch(new URL("/theme-init.js", BASE));
    expect(script.status).toBe(200);
    expect(script.headers.get("content-type")).toMatch(/^text\/javascript/);
    expect(script.headers.get("cache-control")).toBe(CACHE_CONTROL_HTML);
    expect(script.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);

    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("forgot password without an API shows its error, with no CSP violations", async ({
    page,
  }) => {
    const signals = await collectPageSignals(page);
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("audit@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Something went wrong. Try again in a moment.")).toBeVisible();
    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("dashboard card opens the project page without CSP violations", async ({ page }) => {
    const signals = await collectPageSignals(page);
    await page.goto(AUTHED_PATH);
    await page.getByRole("link", { name: /^acme-production/ }).click();
    await expect(page).toHaveURL(/\/projects\/acme-production$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Project data isn't available" }),
    ).toBeVisible();
    // Same dashboard shell as /dashboard: sidebar with Projects, plus a breadcrumb.
    await expect(
      page.getByRole("complementary").getByRole("link", { name: "Projects" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
      "Project data isn't available",
    );
    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("login can be filled without CSP violations", async ({ page }) => {
    const signals = await collectPageSignals(page);
    await page.goto("/login");
    await page.getByLabel("Email").fill("audit@example.com");
    await page.getByLabel("Password").fill("a-sufficiently-long-passphrase");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("dashboard dialog and dynamic toast have no CSP violations", async ({ page }) => {
    const signals = await collectPageSignals(page);
    await page.goto(AUTHED_PATH);
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

    await page.getByRole("button", { name: "New project" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Create a new project" })).toBeVisible();
    await expect(dialog.getByLabel("Project name")).toBeFocused();
    await dialog.getByLabel("Project name").fill("csp-demo");
    await dialog.getByRole("button", { name: "Create project" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Project csp-demo created")).toBeVisible();

    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("assigning innerHTML throws under Trusted Types (test-only, not in the app)", async ({
    page,
  }) => {
    const signals = await collectPageSignals(page);
    await page.goto("/login");
    const result = await page.evaluate(() => {
      const el = document.createElement("div");
      try {
        el.innerHTML = "<b>x</b>";
        return { threw: false, name: "", message: "" };
      } catch (error) {
        const err = error as Error;
        return { threw: true, name: err.name, message: err.message };
      }
    });
    expect(result.threw).toBe(true);
    expect(result.name).toBe("TypeError");
    // The assignment itself is reported as a Trusted Types violation; that is
    // the point of the test. Nothing else on the page should violate.
    const violations = await signals.readViolations();
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(
      violations.every(
        (violation) =>
          violation.effectiveDirective === "require-trusted-types-for" ||
          violation.violatedDirective === "require-trusted-types-for" ||
          violation.effectiveDirective === "trusted-types" ||
          violation.violatedDirective === "trusted-types",
      ),
    ).toBe(true);
  });
});

// The mock API only exists when import.meta.env.DEV is true, so the canvas is
// exercised on a development-mode build served by the same preview server and
// headers (strict CSP + Trusted Types) as production.
const DEV_PORT = Number(process.env.DEV_PREVIEW_PORT || 4174);
const DEV_BASE = `http://127.0.0.1:${DEV_PORT}`;
const DEV_OUT_DIR = "node_modules/.cache/e2e-dev-dist";
const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url));

test.describe("canvas on a dev-mode build under the production CSP", () => {
  let server: ChildProcess | undefined;

  test.beforeAll(async () => {
    test.setTimeout(180_000);
    execFileSync(
      "pnpm",
      ["exec", "vite", "build", "--mode", "development", "--outDir", DEV_OUT_DIR, "--emptyOutDir"],
      { cwd: WEB_ROOT, env: { ...process.env, NODE_ENV: "development" }, stdio: "ignore" },
    );
    server = spawn(
      "pnpm",
      [
        "exec",
        "vite",
        "preview",
        "--outDir",
        DEV_OUT_DIR,
        "--host",
        "127.0.0.1",
        "--port",
        String(DEV_PORT),
        "--strictPort",
      ],
      { cwd: WEB_ROOT, stdio: "ignore", detached: true },
    );
    for (let i = 0; i < 100; i++) {
      const ok = await fetch(DEV_BASE).then(
        (response) => response.ok,
        () => false,
      );
      if (ok) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`dev-mode preview did not start on ${DEV_BASE}`);
  });

  test.afterAll(() => {
    if (server?.pid) process.kill(-server.pid);
  });

  test("serves the same security headers", async () => {
    const response = await fetch(`${DEV_BASE}/projects/acme-production`);
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
  });

  test("canvas, keyboard sheet and list view have no CSP violations", async ({ page }) => {
    const signals = await collectPageSignals(page, DEV_BASE);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${DEV_BASE}/projects/acme-production`);
    const canvas = page.getByRole("region", { name: "Service canvas" });
    await expect(canvas).toBeVisible();
    await expect(canvas.locator(".react-flow__node")).toHaveCount(4);
    await expect(canvas.locator(".react-flow__edge")).toHaveCount(3);

    // React Flow's stylesheet arrives as a same-origin <link>; no <style> of its own.
    const sheets = await page.evaluate(() => ({
      links: Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(
        (link) => new URL(link.href).pathname,
      ),
      flowStyleTags: Array.from(document.querySelectorAll("style")).filter((style) =>
        style.textContent?.includes("react-flow"),
      ).length,
    }));
    expect(sheets.links.some((href) => /^\/assets\/ServiceCanvas-[\w-]+\.css$/.test(href))).toBe(
      true,
    );
    expect(sheets.flowStyleTags).toBe(0);

    const node = canvas.getByRole("button", { name: /^api Repository: acme\/api/ });
    await node.focus();
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: "api" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("tab", { name: "Variables" }).click();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(node).toBeFocused();

    // Drag a node, then zoom and fit with the controls (all inline style writes).
    await canvas.locator('.react-flow__node[data-id="web"]').dragTo(canvas, {
      targetPosition: { x: 120, y: 80 },
    });
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Fit all services in view" }).click();

    await page.getByRole("radio", { name: "List" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Showing list view" })).toBeAttached();
    await page
      .getByRole("list", { name: "Services" })
      .getByRole("button", { name: /^redis/ })
      .click();
    await expect(page.getByRole("dialog", { name: "redis" })).toBeVisible();

    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("30+ services render and stay usable, with no CSP violations", async ({ page }) => {
    const signals = await collectPageSignals(page, DEV_BASE);
    await page.goto(`${DEV_BASE}/projects/fleet`);
    const canvas = page.getByRole("region", { name: "Service canvas" });
    await expect(canvas.locator(".react-flow__node")).toHaveCount(35);
    await page.getByRole("button", { name: "Zoom out" }).click();
    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("below 768px a fresh load shows the list (no canvas flash); a toggled canvas stays legible and touch-pannable", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 720 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    const signals = await collectPageSignals(page, DEV_BASE);
    // Record whether React Flow ever mounts before the user asks for it.
    await page.addInitScript(() => {
      const w = window as unknown as { __canvasMounted?: boolean };
      w.__canvasMounted = false;
      new MutationObserver(() => {
        if (document.querySelector(".react-flow")) w.__canvasMounted = true;
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(`${DEV_BASE}/projects/fleet`);
    await expect(page.getByRole("list", { name: "Services" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "List" })).toHaveAttribute("data-state", "on");
    expect(
      await page.evaluate(
        () => (window as unknown as { __canvasMounted?: boolean }).__canvasMounted,
      ),
    ).toBe(false);

    await page.getByRole("radio", { name: "Canvas" }).click();
    const canvas = page.getByRole("region", { name: "Service canvas" });
    await expect(canvas.locator(".react-flow__node")).toHaveCount(35);
    const viewport = canvas.locator(".react-flow__viewport");
    const scale = async () =>
      viewport.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
    const translate = async () =>
      viewport.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
    await expect.poll(scale).toBeGreaterThanOrEqual(0.75);
    // The first column is on screen, not a shrunken overview of all 35.
    await expect(canvas.locator('.react-flow__node[data-id="edge-gateway-01"]')).toBeInViewport();

    // One-finger swipe on the background pans (touch events via CDP).
    const before = await translate();
    const cdp = await context.newCDPSession(page);
    const box = (await canvas.boundingBox())!;
    const y = box.y + 20; // empty background above the first column
    const touch = (type: string, x: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      });
    await touch("touchStart", box.x + 260);
    for (const x of [240, 200, 160, 120]) await touch("touchMove", box.x + x);
    await touch("touchEnd", 0);
    await expect.poll(translate).toBeLessThan(before - 50);

    await page.getByRole("button", { name: "Center on the first services" }).click();
    await expect.poll(scale).toBeGreaterThanOrEqual(0.75);
    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
    await context.close();
  });

  test("not found and forgot password (mock API) have no CSP violations", async ({ page }) => {
    const signals = await collectPageSignals(page, DEV_BASE);
    await page.goto(`${DEV_BASE}/projects/does-not-exist`);
    await expect(page.getByRole("heading", { level: 1, name: "Project not found" })).toBeVisible();

    await page.goto(`${DEV_BASE}/forgot-password`);
    await page.getByLabel("Email").fill("audit@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeFocused();
    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });
});
