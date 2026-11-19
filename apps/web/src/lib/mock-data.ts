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
  },
  {
    id: "docs-site",
    name: "docs-site",
    services: [{ name: "web", status: "sleeping" }],
    deployedAt: "2d ago",
  },
  {
    id: "preview-pr-42",
    name: "preview/pr-42",
    services: [
      { name: "web", status: "running" },
      { name: "api", status: "running" },
    ],
    deployedAt: "28m ago",
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
  },
];
