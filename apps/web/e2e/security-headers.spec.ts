import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";
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

  test("dashboard without an API shows its unavailable state, not mock projects", async ({
    page,
  }) => {
    const signals = await collectPageSignals(page);
    await page.goto(AUTHED_PATH);
    await expect(page.getByRole("heading", { name: "Projects aren't available" })).toBeVisible();
    await expect(page.getByRole("link", { name: /acme-production/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "New project" })).toHaveCount(0);
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

async function overlaps(nodes: Locator) {
  const boxes = await nodes.evaluateAll((elements) =>
    elements.map((element) => ({
      id: (element as HTMLElement).dataset.id!,
      ...(element.getBoundingClientRect().toJSON() as DOMRect),
    })),
  );
  const hits: string[] = [];
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) {
      if (
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height
      )
        hits.push(`${a.id} × ${b.id}`);
    }
  }
  return hits;
}

/** The middle of an edge's path, in page coordinates. */
/** A point on the edge's path that isn't covered by a card (the middle when free). */
async function edgeMidpoint(canvas: Locator, id: string) {
  return canvas
    .locator(`.react-flow__edge[data-id="${id}"] .react-flow__edge-interaction`)
    .evaluate((element) => {
      const path = element as SVGPathElement;
      const matrix = path.getScreenCTM()!;
      const length = path.getTotalLength();
      for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
        const point = path.getPointAtLength(length * t);
        const x = point.x * matrix.a + matrix.e;
        const y = point.y * matrix.d + matrix.f;
        if (
          document.elementFromPoint(x, y)?.closest(".react-flow__edge") ===
          path.closest(".react-flow__edge")
        )
          return { x, y };
      }
      throw new Error("edge is covered along its whole length");
    });
}

/** A spot of bare canvas background (no card, edge or control) inside `region`. */
async function emptyPoint(region: Locator) {
  return region.evaluate((element) => {
    const box = element.getBoundingClientRect();
    for (let y = box.top + 12; y < box.bottom - 12; y += 8) {
      for (let i = 0; i < box.width - 24; i += 8) {
        const x = box.left + 12 + i;
        const hit = document.elementFromPoint(x, y);
        if (hit?.classList.contains("react-flow__pane")) return { x, y };
      }
    }
    throw new Error("no bare background found");
  });
}

/**
 * Samples every path matching `selector` (every 4px along it, ends excepted) and lists
 * the ones that pass over a card: "edge-id over card-id". Screen coordinates, so it
 * holds at any zoom.
 */
async function pathsOverCards(canvas: Locator, selector: string) {
  return canvas.evaluate((root, sel) => {
    const cards = Array.from(root.querySelectorAll(".react-flow__node")).map((node) => ({
      id: node.getAttribute("data-id"),
      rect: node.getBoundingClientRect(),
    }));
    const hits = new Set<string>();
    for (const path of Array.from(root.querySelectorAll<SVGPathElement>(sel))) {
      const matrix = path.getScreenCTM()!;
      const length = path.getTotalLength();
      const name = path.closest(".react-flow__edge")?.getAttribute("data-id") ?? sel;
      for (let at = 3; at < length - 3; at += 4) {
        const point = path.getPointAtLength(at);
        const x = point.x * matrix.a + matrix.e;
        const y = point.y * matrix.d + matrix.f;
        for (const { id, rect } of cards) {
          if (x > rect.left + 2 && x < rect.right - 2 && y > rect.top + 2 && y < rect.bottom - 2) {
            hits.add(`${name} over ${id}`);
          }
        }
      }
    }
    return [...hits];
  }, selector);
}

async function hoverEdge(page: Page, canvas: Locator, id: string) {
  const { x, y } = await edgeMidpoint(canvas, id);
  await page.mouse.move(x, y);
}

async function clickEdge(page: Page, canvas: Locator, id: string) {
  const { x, y } = await edgeMidpoint(canvas, id);
  await page.mouse.click(x, y);
}

// The mock API only exists when import.meta.env.DEV is true, so the canvas is
// exercised on a development-mode build served by the same preview server and
// headers (strict CSP + Trusted Types) as production.
// One above the production preview port unless set, so a custom PREVIEW_PORT can't collide.
const DEV_PORT = Number(
  process.env.DEV_PREVIEW_PORT || Number(process.env.PREVIEW_PORT || 4173) + 1,
);
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
      viewport.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);
    await expect.poll(scale).toBeGreaterThanOrEqual(0.75);
    // The first column is on screen, not a shrunken overview of all 35.
    await expect(canvas.locator('.react-flow__node[data-id="edge-gateway-01"]')).toBeInViewport();

    // One-finger swipe on the background pans (touch events via CDP).
    const before = await translate();
    const cdp = await context.newCDPSession(page);
    // Swipe up in the card-free gutter left of the first column (the zoom controls sit
    // at its bottom), so the finger lands on background, not on a card.
    const box = (await canvas.boundingBox())!;
    const x = box.x + 36;
    expect(
      await canvas.evaluate((_, p) => document.elementFromPoint(p.x, p.y)?.className, {
        x,
        y: box.y + 220,
      }),
    ).toContain("react-flow__pane");
    const touch = (type: string, y: number) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      });
    await touch("touchStart", box.y + 220);
    for (const dy of [20, 60, 100, 140]) await touch("touchMove", box.y + 220 - dy);
    await touch("touchEnd", 0);
    await expect.poll(translate).toBeLessThan(before - 50);

    await page.getByRole("button", { name: "Center on the first services" }).click();
    await expect.poll(scale).toBeGreaterThanOrEqual(0.75);
    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
    await context.close();
  });

  test("wrapped long names never make cards overlap; each card opens its own sheet", async ({
    page,
  }) => {
    const signals = await collectPageSignals(page, DEV_BASE);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(
      `${DEV_BASE}/projects/northwind-industries-holdings-customer-portal-production-eu-west`,
    );
    const nodes = page.getByRole("region", { name: "Service canvas" }).locator(".react-flow__node");
    await expect(nodes).toHaveCount(4);
    // Let the measured relayout and its refit settle.
    await page.waitForTimeout(500);
    // Links run around the tall wrapped cards (billing → pg passes api), never over them.
    const region = page.getByRole("region", { name: "Service canvas" });
    await expect(region.locator(".react-flow__edge-path")).toHaveCount(4);
    expect(await pathsOverCards(region, ".react-flow__edge-path")).toEqual([]);
    const boxes = await nodes.evaluateAll((elements) =>
      elements.map((element) => {
        const r = element.getBoundingClientRect();
        return {
          id: (element as HTMLElement).dataset.id!,
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
        };
      }),
    );
    for (const [i, a] of boxes.entries()) {
      for (const b of boxes.slice(i + 1)) {
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
    // Clicking the bottom (status/deploy row) of the tall card opens that card's sheet.
    const frontend = boxes.find(
      (box) => box.id === "customer-portal-server-side-rendering-frontend",
    )!;
    await page.mouse.click(frontend.x + frontend.w / 2, frontend.y + frontend.h - 8);
    await expect(
      page.getByRole("dialog", { name: "customer-portal-server-side-rendering-frontend" }),
    ).toBeVisible();
    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("canvas editing: right-click and toolbar add, drag-link, delete by key and button, auto-arrange; no CSP violations", async ({
    page,
  }) => {
    const signals = await collectPageSignals(page, DEV_BASE);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${DEV_BASE}/projects/acme-production`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const canvas = page.getByRole("region", { name: "Service canvas" });
    const nodes = canvas.locator(".react-flow__node");
    const edges = canvas.locator(".react-flow__edge");
    await expect(nodes).toHaveCount(4);
    await page.waitForTimeout(400);
    const area = (await canvas.boundingBox())!;

    // Right-click on the background: the context menu opens; picking Repository opens the dialog.
    const click = { x: area.x + 260, y: area.y + area.height - 120 };
    await page.mouse.click(click.x, click.y, { button: "right" });
    await page.getByRole("menuitem", { name: "Repository" }).click();
    const repoDialog = page.getByRole("dialog", { name: "Add from repository" });
    await expect(repoDialog.getByRole("textbox", { name: "Service name" })).toBeFocused();
    await repoDialog.getByRole("button", { name: "Add service" }).click();
    await expect(repoDialog.getByText("Service name is required.")).toBeVisible();
    await repoDialog.getByRole("textbox", { name: "Service name" }).fill("worker");
    await repoDialog.getByRole("textbox", { name: "Repository name" }).fill("acme/worker");
    await repoDialog.getByRole("button", { name: "Add service" }).click();
    await expect(repoDialog).toBeHidden();
    const worker = canvas.locator('.react-flow__node[data-id="worker"]');
    await expect(worker).toBeFocused();
    const workerBox = (await worker.boundingBox())!;
    expect(Math.abs(workerBox.x + workerBox.width / 2 - click.x)).toBeLessThan(40);

    // Toolbar Add ▸ Docker: a free spot in the middle of the view, overlapping nothing.
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("menuitem", { name: "Docker" }).click();
    const dockerDialog = page.getByRole("dialog", { name: "Add Docker service" });
    await dockerDialog.getByRole("textbox", { name: "Service name" }).fill("cache-warmer");
    await dockerDialog.getByLabel("Type").click();
    await page.getByRole("menuitem", { name: "Cron job" }).click();
    await dockerDialog.getByRole("button", { name: "Dockerfile" }).click();
    await dockerDialog.getByRole("textbox", { name: "Dockerfile" }).fill("FROM alpine:3");
    await dockerDialog.getByRole("button", { name: "Add service" }).click();
    await expect(nodes).toHaveCount(6);
    await expect(canvas.locator('.react-flow__node[data-id="cache-warmer"]')).toBeInViewport();
    expect(await overlaps(nodes)).toEqual([]);

    // Drag from worker's dot onto redis: a new link. Dropping on itself does nothing.
    await worker.hover();
    const dot = (await worker.locator(".react-flow__handle.source").boundingBox())!;
    const redis = (await canvas.locator('.react-flow__node[data-id="redis"]').boundingBox())!;
    await page.mouse.move(dot.x + dot.width / 2, dot.y + dot.height / 2);
    await page.mouse.down();
    await page.mouse.move(redis.x + 60, redis.y + 30, { steps: 10 });
    // The preview line is routed like an edge: around api and every other card.
    await expect(canvas.locator(".react-flow__connection-path")).toHaveCount(1);
    expect(await pathsOverCards(canvas, ".react-flow__connection-path")).toEqual([]);
    await page.mouse.up();
    await expect(edges).toHaveCount(4);
    expect(await pathsOverCards(canvas, ".react-flow__edge-path")).toEqual([]);
    await expect(canvas.locator('.react-flow__edge[data-id="worker->redis"]')).toHaveCount(1);
    await worker.hover();
    await page.mouse.move(dot.x + dot.width / 2, dot.y + dot.height / 2);
    await page.mouse.down();
    await page.mouse.move(workerBox.x + 40, workerBox.y + 20, { steps: 6 });
    await page.mouse.up();
    await expect(edges).toHaveCount(4);
    // ...and doesn't open the card's sheet either.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // web → redis crosses api's row: the preview line goes around api, not over it.
    // Dropped on the background, so no link is made.
    const web = canvas.locator('.react-flow__node[data-id="web"]');
    await web.hover();
    const webDot = (await web.locator(".react-flow__handle.source").boundingBox())!;
    await page.mouse.move(webDot.x + webDot.width / 2, webDot.y + webDot.height / 2);
    await page.mouse.down();
    await page.mouse.move(redis.x + 60, redis.y + 30, { steps: 10 });
    expect(await pathsOverCards(canvas, ".react-flow__connection-path")).toEqual([]);
    const preview = (await canvas.locator(".react-flow__connection-path").boundingBox())!;
    const apiBox = (await canvas.locator('.react-flow__node[data-id="api"]').boundingBox())!;
    expect(preview.x).toBeLessThan(apiBox.x);
    expect(preview.x + preview.width).toBeGreaterThan(apiBox.x + apiBox.width);
    const empty = await emptyPoint(canvas);
    await page.mouse.move(empty.x, empty.y, { steps: 4 });
    await page.mouse.up();
    await expect(edges).toHaveCount(4);

    // Select an edge and press Delete.
    await clickEdge(page, canvas, "worker->redis");
    await expect(
      page.getByRole("button", { name: "Remove connection from worker to redis" }),
    ).toBeVisible();
    await page.keyboard.press("Delete");
    await expect(canvas.locator('.react-flow__edge[data-id="worker->redis"]')).toHaveCount(0);
    // Or hover one and use its remove button.
    await hoverEdge(page, canvas, "web->api");
    await page.getByRole("button", { name: "Remove connection from web to api" }).click();
    await expect(edges).toHaveCount(2);

    // Survives a reload (localStorage, versioned).
    await page.reload();
    await expect(nodes).toHaveCount(6);
    await expect(edges).toHaveCount(2);

    // Pile two cards up, then auto-arrange: nothing intersects.
    await canvas
      .locator('.react-flow__node[data-id="web"]')
      .dragTo(canvas.locator('.react-flow__node[data-id="api"]'));
    expect((await overlaps(nodes)).length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Auto-arrange" }).click();
    await expect.poll(() => overlaps(nodes)).toEqual([]);

    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("domains: generated and custom add, DNS copy and Check again, drag-link and replace, service → domain rejected, routed chain; no CSP violations", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: DEV_BASE });
    const signals = await collectPageSignals(page, DEV_BASE);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${DEV_BASE}/projects/acme-production`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const canvas = page.getByRole("region", { name: "Service canvas" });
    const nodes = canvas.locator(".react-flow__node");
    await expect(nodes).toHaveCount(4);
    await page.waitForTimeout(400);
    const addDomain = async () => {
      await page.getByRole("button", { name: "Add", exact: true }).click();
      await page.getByRole("menuitem", { name: "Domain" }).click();
      return page.getByRole("dialog", { name: "Add a domain" });
    };

    // Generated: "<service>-<hash>.penelope.local", verified with HTTPS at once, linked.
    let dialog = await addDomain();
    await dialog.getByLabel("Target service").click();
    await page.getByRole("menuitem", { name: "web" }).click();
    await expect(dialog.getByRole("textbox", { name: "Subdomain" })).toHaveValue(
      /^web-[0-9a-f]{6}$/,
    );
    await dialog.getByRole("textbox", { name: "Subdomain" }).fill("shop");
    await dialog.getByRole("button", { name: "Add domain" }).click();
    await expect(dialog).toBeHidden();
    const generated = canvas.locator('.react-flow__node[data-id="shop.penelope.local"]');
    await expect(generated).toBeFocused();
    await expect(generated).toContainText("Verified");
    await expect(
      canvas.locator('.react-flow__edge[data-id="shop.penelope.local->web"]'),
    ).toHaveCount(1);
    // Placed in the column left of its service.
    const webBox = (await canvas.locator('.react-flow__node[data-id="web"]').boundingBox())!;
    expect((await generated.boundingBox())!.x + 100).toBeLessThan(webBox.x);

    // Custom: validated, DNS helper with copy, unlinked by default.
    dialog = await addDomain();
    await dialog.getByRole("radio", { name: "Use my own domain" }).check();
    const host = dialog.getByRole("textbox", { name: "Domain name" });
    await host.fill("shop.example.com:443");
    await dialog.getByRole("button", { name: "Add domain" }).click();
    await expect(
      dialog.getByText("Enter just the hostname, without a path, port or @."),
    ).toBeVisible();
    await host.fill("shop.example.com");
    const dns = dialog.getByRole("region", { name: "DNS records" });
    await expect(dns).toContainText("CNAME");
    await dns.getByRole("button", { name: "Copy value cname.penelope.local" }).click();
    await expect(dns.getByRole("status")).toHaveText("Copied cname.penelope.local.");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("cname.penelope.local");
    await dialog.getByRole("button", { name: "Add domain" }).click();
    await expect(dialog).toBeHidden();
    const custom = canvas.locator('.react-flow__node[data-id="shop.example.com"]');
    await expect(custom).toContainText("Pending DNS");

    // Its sheet: Check again → Verified, HTTPS active.
    await custom.click();
    const sheet = page.getByRole("dialog", { name: "shop.example.com" });
    await expect(page).toHaveURL(/\?node=shop\.example\.com$/);
    await expect(sheet.getByText("HTTPS issuing", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "Check again" }).click();
    await expect(sheet.getByText("HTTPS active", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(custom).toContainText("Verified");

    const drag = async (from: Locator, to: Locator) => {
      await from.hover();
      const dot = (await from.locator(".react-flow__handle.source").boundingBox())!;
      const box = (await to.boundingBox())!;
      await page.mouse.move(dot.x + dot.width / 2, dot.y + dot.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
    };
    const api = canvas.locator('.react-flow__node[data-id="api"]');
    const web = canvas.locator('.react-flow__node[data-id="web"]');

    // Drag domain → service links it.
    await drag(custom, api);
    await expect(canvas.locator('.react-flow__edge[data-id="shop.example.com->api"]')).toHaveCount(
      1,
    );
    // Again onto web: replaces the target, and says so.
    await drag(custom, web);
    await expect(canvas.locator('.react-flow__edge[data-id="shop.example.com->web"]')).toHaveCount(
      1,
    );
    await expect(canvas.locator('.react-flow__edge[data-id="shop.example.com->api"]')).toHaveCount(
      0,
    );
    await expect(
      canvas.getByText("shop.example.com now routes to web instead of api."),
    ).toBeVisible();

    // Service → domain is rejected with a visible reason; nothing is linked.
    const before = await canvas.locator(".react-flow__edge").count();
    await drag(api, custom);
    await expect(canvas.getByText(/Nothing links into a domain/)).toBeVisible();
    await expect(canvas.locator(".react-flow__edge")).toHaveCount(before);
    await expect(canvas.locator('.react-flow__edge[data-id^="api->shop"]')).toHaveCount(0);

    // Unlink like any edge: select + Delete.
    await clickEdge(page, canvas, "shop.example.com->web");
    await page.keyboard.press("Delete");
    await expect(canvas.locator('.react-flow__edge[data-id="shop.example.com->web"]')).toHaveCount(
      0,
    );

    // domain → web → api → postgres, after a reload and an auto-arrange: no link crosses a card.
    await page.reload();
    await expect(nodes).toHaveCount(6);
    await page.getByRole("button", { name: "Auto-arrange" }).click();
    await expect.poll(() => overlaps(nodes)).toEqual([]);
    await page.waitForTimeout(400);
    for (const id of ["shop.penelope.local->web", "web->api", "api->postgres"]) {
      await expect(canvas.locator(`.react-flow__edge[data-id="${id}"]`)).toHaveCount(1);
    }
    expect(await pathsOverCards(canvas, ".react-flow__edge-path")).toEqual([]);
    const domainX = (await generated.boundingBox())!.x;
    for (const id of ["web", "api", "postgres", "redis"]) {
      const box = (await canvas.locator(`.react-flow__node[data-id="${id}"]`).boundingBox())!;
      expect(domainX).toBeLessThan(box.x);
    }

    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("keyboard: Space opens, Esc keeps focus, arrows move; links are added and removed in Connections; Back closes the sheet", async ({
    page,
  }) => {
    const signals = await collectPageSignals(page, DEV_BASE);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${DEV_BASE}/projects/acme-production`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const canvas = page.getByRole("region", { name: "Service canvas" });
    const edges = canvas.locator(".react-flow__edge");
    await expect(edges).toHaveCount(3);

    const web = canvas.locator('.react-flow__node[data-id="web"]');
    await expect(web).toHaveAttribute("aria-roledescription", "service");
    await web.focus();
    await page.keyboard.press("Escape");
    await expect(web).toBeFocused();
    const before = (await web.boundingBox())!;
    await page.keyboard.press("Shift+ArrowDown");
    await expect.poll(async () => (await web.boundingBox())!.y).toBeGreaterThan(before.y + 20);
    await expect(web).toBeFocused();

    await page.keyboard.press(" ");
    const sheet = page.getByRole("dialog", { name: "web" });
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL(/\?node=web$/);
    await sheet.getByRole("tab", { name: "Deployments" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(sheet.getByRole("tab", { name: "Variables" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(sheet.getByRole("tab", { name: "Settings" })).toBeFocused();
    const connections = sheet.getByRole("region", { name: "Connections" });
    await connections.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: "redis" }).click();
    await connections.getByRole("button", { name: "Add" }).press("Enter");
    await expect(
      connections.getByRole("button", { name: "Remove connection from web to redis" }),
    ).toBeVisible();
    await connections
      .getByRole("button", { name: "Remove connection from web to api" })
      .press("Enter");
    await expect(
      connections.getByRole("button", { name: "Remove connection from web to redis" }),
    ).toBeFocused();

    // Back closes the sheet, focus returns to the card, and the canvas shows the new links.
    await page.goBack();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/projects\/acme-production$/);
    await expect(web).toBeFocused();
    await expect(canvas.locator('.react-flow__edge[data-id="web->redis"]')).toHaveCount(1);
    await expect(canvas.locator('.react-flow__edge[data-id="web->api"]')).toHaveCount(0);

    // A deep link opens the sheet straight away; old ?service= links become ?node=.
    await page.goto(`${DEV_BASE}/projects/acme-production?service=postgres`);
    await expect(page.getByRole("dialog", { name: "postgres" })).toBeVisible();
    await expect(page).toHaveURL(/\?node=postgres$/);

    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("60+ services on a laptop show the first column readably; 320 keeps cards clear of the zoom controls; long-press adds", async ({
    browser,
    page,
  }) => {
    const signals = await collectPageSignals(page, DEV_BASE);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${DEV_BASE}/projects/fleet-xl`);
    const canvas = page.getByRole("region", { name: "Service canvas" });
    await expect(canvas.locator(".react-flow__node")).toHaveCount(70);
    const scale = () =>
      canvas
        .locator(".react-flow__viewport")
        .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a);
    await expect.poll(scale).toBeGreaterThanOrEqual(0.5);
    await expect(page.getByRole("button", { name: "Center on the first services" })).toBeVisible();
    await expect(canvas.locator('.react-flow__node[data-id="edge-gateway-01"]')).toBeInViewport();
    // Every link is orthogonal and routed around the cards, none drawn over one.
    await expect.poll(() => canvas.locator(".react-flow__edge-path").count()).toBeGreaterThan(100);
    expect(await pathsOverCards(canvas, ".react-flow__edge-path")).toEqual([]);
    expect(
      await canvas
        .locator(".react-flow__edge-path")
        .evaluateAll((paths) => paths.filter((p) => / C/.test(p.getAttribute("d") ?? "")).length),
    ).toBe(0);
    assertNoSecurityViolations(await signals.readViolations());

    const context = await browser.newContext({
      viewport: { width: 320, height: 640 },
      hasTouch: true,
      isMobile: true,
    });
    const phone = await context.newPage();
    const phoneSignals = await collectPageSignals(phone, DEV_BASE);
    await phone.goto(`${DEV_BASE}/projects/fleet`);
    await phone.getByRole("radio", { name: "Canvas" }).click();
    const small = phone.getByRole("region", { name: "Service canvas" });
    await expect(small.locator(".react-flow__node")).toHaveCount(35);
    await phone.waitForTimeout(400);
    const controls = (await small.getByRole("group", { name: "Canvas controls" }).boundingBox())!;
    const cards = await small
      .locator(".react-flow__node")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().toJSON() as DOMRect),
      );
    for (const card of cards) {
      const hit =
        card.x < controls.x + controls.width &&
        controls.x < card.x + card.width &&
        card.y < controls.y + controls.height &&
        controls.y < card.y + card.height;
      expect(hit, "a card sits under the zoom controls").toBe(false);
    }

    // Long-press on the background opens Add service (touch has no right-click).
    const cdp = await context.newCDPSession(phone);
    const point = await emptyPoint(small);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await phone.waitForTimeout(800);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await phone.getByRole("menuitem", { name: "Repository" }).click();
    await expect(phone.getByRole("dialog", { name: "Add from repository" })).toBeVisible();

    assertNoSecurityViolations(await phoneSignals.readViolations());
    expect(phoneSignals.thirdParty.map((request) => request.url())).toEqual([]);
    await context.close();
  });

  test("dashboard (mock projects) card opens the project page without CSP violations", async ({
    page,
  }) => {
    const signals = await collectPageSignals(page, DEV_BASE);
    await page.goto(`${DEV_BASE}${AUTHED_PATH}`);
    await page.getByRole("link", { name: /^acme-production/ }).click();
    await expect(page).toHaveURL(/\/projects\/acme-production$/);
    await expect(page.getByRole("heading", { level: 1, name: "acme-production" })).toBeVisible();
    // Same dashboard shell as /dashboard: sidebar with Projects, plus a breadcrumb.
    await expect(
      page.getByRole("complementary").getByRole("link", { name: "Projects" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
      "acme-production",
    );
    assertNoSecurityViolations(await signals.readViolations());
    expect(signals.thirdParty.map((request) => request.url())).toEqual([]);
  });

  test("dashboard dialog and dynamic toast have no CSP violations", async ({ page }) => {
    const signals = await collectPageSignals(page, DEV_BASE);
    await page.goto(`${DEV_BASE}${AUTHED_PATH}`);
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
