import type { ServiceStatus } from "@/types/project";

export type ServiceKind = "web" | "service" | "worker" | "cron" | "database" | "cache";
export type ServiceSourceType = "repo" | "image" | "dockerfile";

export interface ServiceSource {
  type: ServiceSourceType;
  /** e.g. "acme/web", "postgres:16-alpine", "services/api/Dockerfile". */
  label: string;
}

/** What the canvas knows about a service beyond the API's name and status. */
export interface ServiceDetails {
  kind: ServiceKind;
  source: ServiceSource | null;
  /** ISO 8601, or null when the service has never been deployed. */
  deployedAt: string | null;
  /** Names of services this one talks to (database URL, internal hostname, …). */
  references: string[];
}

export interface CanvasService extends ServiceDetails {
  /** Service names are unique within a project, so the name doubles as the id. */
  id: string;
  name: string;
  status: ServiceStatus;
}

export type ProjectView = "canvas" | "list";
