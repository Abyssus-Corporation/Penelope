import { expect, test, type Page, type Response } from "@playwright/test";
import {
  CACHE_CONTROL_HTML,
  CACHE_CONTROL_IMMUTABLE,
  PREVIEW_SECURITY_HEADERS,
} from "../security-headers";

interface CspViolation {
  blockedURI: string;
  disposition: SecurityPolicyViolationEvent["disposition"];
  effectiveDirective: string;
  violatedDirective: string;
}

declare global {
  interface Window {
    __cspViolations?: CspViolation[];
  }
}

const BASE = new URL("http://127.0.0.1:4173");

function collectPageSignals(page: Page) {
  const foreignRequests: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== BASE.origin) {
      foreignRequests.push(request.url());
    }
  });

  return {
    foreignRequests,
    async enforcedViolations() {
      const violations = await page.evaluate(() => window.__cspViolations ?? []);
      return violations.filter((violation) => violation.disposition === "enforce");
    },
  };
}

function expectSecurityHeaders(response: Response | null) {
  expect(response, "navigation should produce a response").not.toBeNull();
  const headers = response!.headers();
  for (const [name, value] of Object.entries(PREVIEW_SECURITY_HEADERS)) {
    expect(headers[name.toLowerCase()], name).toBe(value);
  }
  expect(headers["strict-transport-security"]).toBeFalsy();
  expect(headers["cache-control"]).toBe(CACHE_CONTROL_HTML);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations = window.__cspViolations ?? [];
      window.__cspViolations.push({
        blockedURI: event.blockedURI,
        disposition: event.disposition,
        effectiveDirective: event.effectiveDirective,
        violatedDirective: event.violatedDirective,
      });
    });
  });
});

test("login, signup, and dashboard stay first-party under the preview CSP", async ({ page }) => {
  const signals = collectPageSignals(page);

  const login = await page.goto("/login");
  expectSecurityHeaders(login);
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

  const signup = await page.goto("/signup");
  expectSecurityHeaders(signup);
  await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();

  const dashboard = await page.goto("/dashboard");
  expectSecurityHeaders(dashboard);
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

  expect(signals.foreignRequests, "no requests should leave the preview origin").toEqual([]);
  expect(await signals.enforcedViolations(), "no enforced CSP violations").toEqual([]);
});

test("creating a project opens the dialog and shows a toast without CSP violations", async ({
  page,
}) => {
  const signals = collectPageSignals(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

  const newProject = page.getByRole("button", { name: "New project" });
  await newProject.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Create a new project" })).toBeVisible();
  await expect(dialog.getByLabel("Project name")).toBeFocused();

  await dialog.getByLabel("Project name").fill("csp-demo");
  await dialog.getByRole("button", { name: "Create project" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("Project csp-demo created")).toBeVisible();

  expect(signals.foreignRequests, "no requests should leave the preview origin").toEqual([]);
  expect(await signals.enforcedViolations(), "no enforced CSP violations").toEqual([]);
});

test("hashed assets and self-hosted fonts are cached immutably", async ({ page, request }) => {
  const response = await page.goto("/dashboard");
  expectSecurityHeaders(response);

  const assetPaths = await page.evaluate(() => {
    const urls = [
      ...[...document.querySelectorAll("script[src]")].map((el) => (el as HTMLScriptElement).src),
      ...[...document.querySelectorAll("link[rel=stylesheet]")].map(
        (el) => (el as HTMLLinkElement).href,
      ),
    ];
    return urls
      .map((url) => new URL(url).pathname)
      .filter((pathname) => pathname.startsWith("/assets/"));
  });
  expect(assetPaths.length, "the document should reference hashed /assets/ files").toBeGreaterThan(
    0,
  );

  for (const pathname of assetPaths) {
    const asset = await request.get(pathname);
    expect(asset.ok(), pathname).toBeTruthy();
    expect(asset.headers()["cache-control"], pathname).toBe(CACHE_CONTROL_IMMUTABLE);
    expect(asset.headers()["content-security-policy"], pathname).toBe(
      PREVIEW_SECURITY_HEADERS["Content-Security-Policy"],
    );
  }

  const font = await request.get("/fonts/ObelMono-VF.woff2");
  expect(font.ok()).toBeTruthy();
  expect(font.headers()["cache-control"]).toBe(CACHE_CONTROL_IMMUTABLE);
});
