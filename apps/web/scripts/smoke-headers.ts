/**
 * Compare Vite preview and Caddy headers against `security-headers.ts`.
 *
 * Expects `apps/web/dist` to already exist (CI builds once, then e2e and this
 * smoke both reuse it). Override ports with PREVIEW_PORT / CADDY_PORT and the
 * Caddy binary with CADDY_BIN.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import {
  CACHE_CONTROL_ERROR,
  CACHE_CONTROL_HTML,
  CACHE_CONTROL_IMMUTABLE,
  CADDY_SECURITY_HEADERS,
  CONTENT_SECURITY_POLICY,
  CONTENT_SECURITY_POLICY_TLS,
  PREVIEW_SECURITY_HEADERS,
} from "../security-headers.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const dist = join(root, "apps/web/dist");
const previewPort = Number(process.env.PREVIEW_PORT || 4173);
const caddyPort = Number(process.env.CADDY_PORT || 8888);
const caddyBin = process.env.CADDY_BIN || "caddy";
const previewOrigin = `http://127.0.0.1:${previewPort}`;
const caddyOrigin = `http://127.0.0.1:${caddyPort}`;

const COMPARED_SECURITY_HEADERS = Object.keys(PREVIEW_SECURITY_HEADERS).filter(
  (name) => name !== "Content-Security-Policy",
);

function fail(message: string): never {
  console.error(message);
  process.exitCode = 1;
  throw new Error(message);
}

async function waitForOk(url: string, label: string, timeoutMs = 20_000) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      last = `${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await delay(150);
  }
  fail(`${label} did not become ready at ${url}: ${last}`);
}

function start(command: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}): ChildProcess {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  child.stdout?.on("data", (chunk) => process.stdout.write(`[${command}] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[${command}] ${chunk}`));
  return child;
}

function stop(child: ChildProcess | undefined) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function header(response: Response, name: string) {
  return response.headers.get(name.toLowerCase());
}

async function fetchOrFail(url: string) {
  try {
    return await fetch(url, { redirect: "manual" });
  } catch (error) {
    fail(`request failed ${url}: ${error instanceof Error ? error.message : error}`);
  }
}

function expectEq(actual: string | null, expected: string | null, label: string) {
  if (actual !== expected) {
    fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function assertHtml(origin: string, kind: "preview" | "caddy") {
  const response = await fetchOrFail(new URL("/login", origin).href);
  if (response.status !== 200) fail(`${kind} /login: expected 200, got ${response.status}`);
  const expectedCsp = kind === "caddy" ? CONTENT_SECURITY_POLICY_TLS : CONTENT_SECURITY_POLICY;
  const expectedSecurity = kind === "caddy" ? CADDY_SECURITY_HEADERS : PREVIEW_SECURITY_HEADERS;
  expectEq(header(response, "Content-Security-Policy"), expectedCsp, `${kind} /login CSP`);
  expectEq(
    header(response, "Content-Security-Policy-Report-Only"),
    null,
    `${kind} /login report-only`,
  );
  for (const name of COMPARED_SECURITY_HEADERS) {
    expectEq(header(response, name), expectedSecurity[name], `${kind} /login ${name}`);
  }
  if (kind === "caddy") {
    expectEq(
      header(response, "Strict-Transport-Security"),
      CADDY_SECURITY_HEADERS["Strict-Transport-Security"],
      `${kind} /login HSTS`,
    );
  } else {
    expectEq(header(response, "Strict-Transport-Security"), null, `${kind} /login HSTS`);
  }
  expectEq(header(response, "Cache-Control"), CACHE_CONTROL_HTML, `${kind} /login cache`);
  return response;
}

async function hashedAssetPath() {
  const response = await fetchOrFail(new URL("/login", previewOrigin).href);
  const html = await response.text();
  const match = html.match(/\/assets\/[^"' ]+\.js/);
  if (!match) fail("built HTML did not reference a hashed /assets/*.js file");
  return match[0];
}

async function assertAsset(origin: string, assetPath: string, kind: "preview" | "caddy") {
  const response = await fetchOrFail(new URL(assetPath, origin).href);
  if (response.status !== 200) fail(`${kind} ${assetPath}: expected 200, got ${response.status}`);
  expectEq(
    header(response, "Cache-Control"),
    CACHE_CONTROL_IMMUTABLE,
    `${kind} ${assetPath} cache`,
  );
  const expectedCsp = kind === "caddy" ? CONTENT_SECURITY_POLICY_TLS : CONTENT_SECURITY_POLICY;
  expectEq(header(response, "Content-Security-Policy"), expectedCsp, `${kind} ${assetPath} CSP`);
}

async function assertMissingAsset(origin: string, kind: "preview" | "caddy") {
  const response = await fetchOrFail(
    new URL("/assets/missing-asset-does-not-exist.js", origin).href,
  );
  if (response.status !== 404) {
    fail(`${kind} missing asset: expected 404, got ${response.status}`);
  }
  const body = await response.text();
  if (/<!doctype html>/i.test(body) || /<div id="root">/i.test(body)) {
    fail(`${kind} missing asset returned index.html instead of 404`);
  }
  expectEq(header(response, "Cache-Control"), CACHE_CONTROL_ERROR, `${kind} missing asset cache`);
  const expectedCsp = kind === "caddy" ? CONTENT_SECURITY_POLICY_TLS : CONTENT_SECURITY_POLICY;
  expectEq(header(response, "Content-Security-Policy"), expectedCsp, `${kind} missing asset CSP`);
  expectEq(header(response, "X-Content-Type-Options"), "nosniff", `${kind} missing asset nosniff`);
}

async function comparePreviewToCaddy() {
  const preview = await fetchOrFail(new URL("/login", previewOrigin).href);
  const caddy = await fetchOrFail(new URL("/login", caddyOrigin).href);
  for (const name of COMPARED_SECURITY_HEADERS) {
    expectEq(header(caddy, name), header(preview, name), `Caddy vs preview ${name}`);
  }
  expectEq(
    header(preview, "Cache-Control"),
    header(caddy, "Cache-Control"),
    "Caddy vs preview HTML cache",
  );
}

async function main() {
  if (!existsSync(join(dist, "index.html"))) {
    fail(`missing ${dist}/index.html; run pnpm build first`);
  }

  const children: ChildProcess[] = [];
  const onExit = () => {
    for (const child of children) stop(child);
  };
  process.on("exit", onExit);
  process.on("SIGINT", () => process.exit(1));
  process.on("SIGTERM", () => process.exit(1));

  const preview = start("pnpm", [
    "--filter",
    "@penelope/web",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(previewPort),
    "--strictPort",
  ]);
  children.push(preview);

  const caddy = start(
    caddyBin,
    ["run", "--config", join(root, "deploy/Caddyfile"), "--adapter", "caddyfile"],
    {
      DASHBOARD_DOMAIN: caddyOrigin,
      DASHBOARD_ROOT: resolve(dist),
    },
  );
  children.push(caddy);

  await waitForOk(`${previewOrigin}/login`, "preview");
  await waitForOk(`${caddyOrigin}/login`, "caddy");

  await assertHtml(previewOrigin, "preview");
  await assertHtml(caddyOrigin, "caddy");
  const assetPath = await hashedAssetPath();
  await assertAsset(previewOrigin, assetPath, "preview");
  await assertAsset(caddyOrigin, assetPath, "caddy");
  await assertMissingAsset(previewOrigin, "preview");
  await assertMissingAsset(caddyOrigin, "caddy");
  await comparePreviewToCaddy();

  console.log("header smoke passed (preview and Caddy match security-headers.ts)");
  for (const child of children) stop(child);
  await delay(300);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
