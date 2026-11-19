import type { Project } from "@/types/project";

export const PROJECTS: Project[] = [
  {
    id: "acme-production",
    name: "acme-production",
    services: [
      { name: "web", status: "running" },
      { name: "api", status: "running" },
      { name: "postgres", status: "running" },
      { name: "redis", status: "running" },
    ],
    deployedAt: "4m ago",
    repo: {
      provider: "github",
      owner: "acme",
      name: "production",
      lastCommit: { id: "a3f09c1", message: "fix: resolve memory leak in api worker" },
    },
  },
  {
    id: "staging",
    name: "staging",
    services: [
      { name: "web", status: "running" },
      { name: "api", status: "building" },
      { name: "postgres", status: "running" },
    ],
    deployedAt: "12m ago",
    repo: {
      provider: "github",
      owner: "acme",
      name: "staging",
      lastCommit: { id: "b2e4d1f", message: "feat: add rate limiting to public endpoints" },
    },
  },
  {
    id: "analytics",
    name: "analytics",
    services: [
      { name: "api", status: "running" },
      { name: "postgres", status: "running" },
      { name: "worker", status: "failed" },
    ],
    deployedAt: "3h ago",
    repo: {
      provider: "github",
      owner: "acme",
      name: "analytics",
      lastCommit: { id: "7c8a9b2", message: "chore: bump dependencies" },
    },
  },
  {
    id: "docs-site",
    name: "docs-site",
    services: [{ name: "web", status: "sleeping" }],
    deployedAt: "2d ago",
    repo: {
      provider: "github",
      owner: "acme",
      name: "docs",
      lastCommit: { id: "1d4f5a3", message: "docs: update deployment guide" },
    },
  },
  {
    id: "preview-pr-42",
    name: "preview/pr-42",
    services: [
      { name: "web", status: "running" },
      { name: "api", status: "running" },
    ],
    deployedAt: "28m ago",
    repo: {
      provider: "github",
      owner: "acme",
      name: "web",
      lastCommit: { id: "c5d9e1a", message: "fix: auth token refresh on 401" },
    },
  },
  {
    id: "monitoring",
    name: "monitoring",
    services: [
      { name: "grafana", status: "running" },
      { name: "prometheus", status: "running" },
      { name: "postgres", status: "running" },
      { name: "alertmanager", status: "running" },
      { name: "loki", status: "running" },
      { name: "tempo", status: "sleeping" },
    ],
    deployedAt: "6h ago",
    repo: {
      provider: "github",
      owner: "acme",
      name: "monitoring",
      lastCommit: { id: "9b1c2d4", message: "feat: add loki datasource to grafana" },
    },
  },
];
