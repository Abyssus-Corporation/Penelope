// Dev and test fixtures only. Imported through `import.meta.env.DEV` dynamic
// imports (see data.ts and api/index.ts), so none of this reaches production dist.
import type { ApiProject, ApiService } from "@/api";
import type { ServiceDetails, ServiceKind, ServiceSource } from "./types";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const repo = (label: string): ServiceSource => ({ type: "repo", label });
const image = (label: string): ServiceSource => ({ type: "image", label });
const dockerfile = (label: string): ServiceSource => ({ type: "dockerfile", label });

function detail(
  kind: ServiceKind,
  source: ServiceSource | null,
  deployedMinutesAgo: number | null,
  references: string[] = [],
): ServiceDetails {
  return {
    kind,
    source,
    deployedAt: deployedMinutesAgo === null ? null : minutesAgo(deployedMinutesAgo),
    references,
  };
}

// ─── Extra projects for break-ui cases ───────────────────────────────────────

const FLEET_KINDS: { prefix: string; kind: ServiceKind; count: number }[] = [
  { prefix: "edge-gateway", kind: "web", count: 2 },
  { prefix: "storefront", kind: "web", count: 5 },
  { prefix: "api", kind: "service", count: 12 },
  { prefix: "worker", kind: "worker", count: 8 },
  { prefix: "cron", kind: "cron", count: 3 },
  { prefix: "postgres", kind: "database", count: 3 },
  { prefix: "redis", kind: "cache", count: 2 },
];
const STATUSES: ApiService["status"][] = ["running", "running", "running", "building", "failed"];

/** `scale` 1: 35 services ("fleet"); 2: 70 ("fleet-xl", the big-graph fit case). */
const fleetNames = (scale: number) =>
  FLEET_KINDS.flatMap(({ prefix, count }) =>
    Array.from({ length: count * scale }, (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`),
  );
const kindOf = (name: string) => FLEET_KINDS.find((k) => name.startsWith(k.prefix))!.kind;

function fleetDetails(names: string[]): Record<string, ServiceDetails> {
  const ofKind = (kind: ServiceKind) => names.filter((name) => kindOf(name) === kind);
  const apis = ofKind("service");
  const dbs = ofKind("database");
  const caches = ofKind("cache");
  const out: Record<string, ServiceDetails> = {};
  names.forEach((name, i) => {
    const kind = kindOf(name);
    const refs =
      kind === "web"
        ? [apis[i % apis.length]!, apis[(i + 3) % apis.length]!]
        : kind === "service" || kind === "worker" || kind === "cron"
          ? [dbs[i % dbs.length]!, caches[i % caches.length]!]
          : [];
    const source =
      kind === "database"
        ? image("postgres:16-alpine")
        : kind === "cache"
          ? image("redis:7.4")
          : kind === "worker"
            ? dockerfile(`services/${name}/Dockerfile`)
            : repo(`fleet/${name}`);
    out[name] = detail(kind, source, i === 7 ? null : 5 + i * 17, refs);
  });
  return out;
}

const fleetProject = (id: string, names: string[]): ApiProject => ({
  id,
  name: id,
  services: names.map((name, i) => ({ name, status: STATUSES[i % STATUSES.length]! })),
  deployedAt: minutesAgo(5),
  repo: { provider: "github", owner: "fleet", name: "platform" },
});

export const CANVAS_FIXTURE_PROJECTS: ApiProject[] = [
  fleetProject("fleet", fleetNames(1)),
  fleetProject("fleet-xl", fleetNames(2)),
  {
    id: "loop",
    name: "loop",
    services: [
      { name: "orders", status: "running" },
      { name: "inventory", status: "running" },
      { name: "billing", status: "failed" },
      { name: "notifier", status: "sleeping" },
    ],
    deployedAt: minutesAgo(42),
    repo: null,
  },
  {
    id: "islands",
    name: "islands",
    services: [
      { name: "marketing-site", status: "running" },
      { name: "status-page", status: "sleeping" },
      { name: "nightly-export", status: "running" },
      { name: "scratch", status: "building" },
    ],
    deployedAt: minutesAgo(60 * 26),
    repo: null,
  },
];

// ─── Canvas details per project id ───────────────────────────────────────────

export const SERVICE_DETAILS: Record<string, Record<string, ServiceDetails>> = {
  "acme-production": {
    web: detail("web", repo("acme/web"), 4, ["api"]),
    api: detail("service", repo("acme/api"), 4, ["postgres", "redis"]),
    postgres: detail("database", image("postgres:16-alpine"), 60 * 24 * 9),
    redis: detail("cache", image("redis:7.4"), 60 * 24 * 9),
  },
  staging: {
    web: detail("web", repo("acme/web"), 12, ["api"]),
    api: detail("service", repo("acme/api"), 2, ["postgres"]),
    postgres: detail("database", image("postgres:16-alpine"), 60 * 24 * 30),
  },
  analytics: {
    api: detail("service", repo("acme/analytics"), 180, ["postgres"]),
    postgres: detail("database", image("postgres:16-alpine"), 60 * 24 * 60),
    worker: detail("worker", dockerfile("workers/ingest/Dockerfile"), 181, ["postgres", "api"]),
  },
  "docs-site": {
    web: detail("web", repo("acme/docs"), 60 * 24 * 3),
  },
  "northwind-industries-holdings-customer-portal-production-eu-west": {
    "customer-portal-server-side-rendering-frontend": detail(
      "web",
      repo("northwind-industries-holdings-platform-engineering/customer-portal-monorepo"),
      30,
      ["api"],
    ),
    "billing-reconciliation-worker": detail(
      "worker",
      dockerfile("services/billing/reconciliation/worker/Dockerfile.production"),
      95,
      ["api", "pg"],
    ),
    api: detail("service", repo("northwind-industries-holdings-platform-engineering/api"), 31, [
      "pg",
    ]),
    pg: detail(
      "database",
      image("ghcr.io/northwind-industries/postgres-with-extensions:16.4"),
      null,
    ),
  },
  fleet: fleetDetails(fleetNames(1)),
  "fleet-xl": fleetDetails(fleetNames(2)),
  loop: {
    orders: detail("service", repo("loop/orders"), 42, ["inventory", "billing"]),
    inventory: detail("service", repo("loop/inventory"), 50, ["orders"]),
    billing: detail("service", repo("loop/billing"), 47, ["notifier"]),
    notifier: detail("worker", dockerfile("notifier/Dockerfile"), 61, ["orders"]),
  },
  islands: {
    "marketing-site": detail("web", repo("islands/marketing"), 60 * 26),
    "status-page": detail("web", image("louislam/uptime-kuma:1"), 60 * 24 * 40),
    "nightly-export": detail("cron", dockerfile("jobs/export/Dockerfile"), 60 * 7),
    scratch: detail("service", null, null),
  },
};
