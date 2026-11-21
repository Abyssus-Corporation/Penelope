import { CANVAS_FIXTURE_PROJECTS } from "@/components/project-canvas/fixtures";
import { PROJECTS } from "@/lib/mock-data";
import type { ApiClient, ApiProject } from "./client";

const LATENCY_MS = 350;

const EXTRA_PROJECTS: ApiProject[] = [
  { id: "empty", name: "empty", services: [], deployedAt: "", repo: null },
  {
    id: "northwind-industries-holdings-customer-portal-production-eu-west",
    name: "northwind-industries-holdings-customer-portal-production-eu-west",
    services: [
      { name: "customer-portal-server-side-rendering-frontend", status: "running" },
      { name: "billing-reconciliation-worker", status: "failed" },
      { name: "api", status: "building" },
      { name: "pg", status: "sleeping" },
    ],
    deployedAt: "2026-11-20T09:41:00Z",
    repo: {
      provider: "gitlab",
      owner: "northwind-industries-holdings-platform-engineering",
      name: "customer-portal-monorepo-with-a-very-descriptive-name",
      lastCommit: {
        id: "9f3c2a7e1b4d8f60c5a2e9d7b3f1a8c4e6d2b0a9",
        message:
          "fix(billing): retry reconciliation when the upstream ledger returns 409 Conflict during month-end close (Aleksandra Wiśniewska-Kowalczyk)",
      },
    },
  },
];

type Scenario = "loading" | "error" | null;

// Dev-only switch for screenshots and QA: ?mock=loading never resolves, ?mock=error rejects.
function scenario(): Scenario {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get("mock");
  return value === "loading" || value === "error" ? value : null;
}

function respond<T>(value: () => T): Promise<T> {
  const mode = scenario();
  return new Promise((resolve, reject) => {
    if (mode === "loading") return;
    setTimeout(() => {
      if (mode === "error") reject(new Error("Network error"));
      else resolve(value());
    }, LATENCY_MS);
  });
}

export const mockApi: ApiClient = {
  projects: {
    get: (id) =>
      respond(
        () =>
          [...PROJECTS, ...EXTRA_PROJECTS, ...CANVAS_FIXTURE_PROJECTS].find(
            (project) => project.id === id,
          ) ?? null,
      ),
  },
  auth: {
    requestPasswordReset: () => respond(() => undefined),
  },
};
