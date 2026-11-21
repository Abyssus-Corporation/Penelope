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

type CspViolation = {
  blockedURI: string;
  violatedDirective: string;
  effectiveDirective: string;
  disposition: string;
  originalPolicy: string;
};

async function collectPageSignals(page: Page) {
  const thirdParty: Request[] = [];
  const violations: CspViolation[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== BASE.origin) {
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
