import type { Project } from "@/types/project";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

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
    deployedAt: minutesAgo(4),
  },
  {
    id: "staging",
    name: "staging",
    services: [
      { name: "web", status: "running" },
      { name: "api", status: "building" },
      { name: "postgres", status: "running" },
    ],
    deployedAt: minutesAgo(12),
  },
  {
    id: "analytics",
    name: "analytics",
    services: [
      { name: "api", status: "running" },
      { name: "postgres", status: "running" },
      { name: "worker", status: "failed" },
    ],
    deployedAt: minutesAgo(180),
  },
  {
    id: "docs-site",
    name: "docs-site",
    services: [{ name: "web", status: "sleeping" }],
    deployedAt: minutesAgo(2880),
  },
  {
    id: "preview-pr-42",
    name: "preview/pr-42",
    services: [
      { name: "web", status: "running" },
      { name: "api", status: "running" },
    ],
    deployedAt: minutesAgo(28),
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
    deployedAt: minutesAgo(360),
  },
];
