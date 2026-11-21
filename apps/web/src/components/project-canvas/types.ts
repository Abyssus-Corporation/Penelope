import type { ServiceStatus } from "@/types/project";

export const SERVICE_KINDS = ["web", "service", "worker", "cron", "database", "cache"] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];
export const SOURCE_TYPES = ["repo", "image", "dockerfile"] as const;
export type ServiceSourceType = (typeof SOURCE_TYPES)[number];

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
  /** null: added on the canvas and never deployed. */
  status: ServiceStatus | null;
}

/**
 * A link between two services, stored per project. Kept to {id, source, target} so
 * later fields (e.g. which variables carry the link) can be added behind a new
 * storage version without changing how edges are keyed.
 */
export interface ServiceEdge {
  /** Always `${source}->${target}`: one edge per direction between two services. */
  id: string;
  source: string;
  target: string;
}

export type Point = { x: number; y: number };

export type ProjectView = "canvas" | "list";

export const DOMAIN_TYPES = ["generated", "custom"] as const;
/** generated: a Penelope subdomain (verified, HTTPS at once); custom: the user's own hostname. */
export type DomainType = (typeof DOMAIN_TYPES)[number];

/**
 * A domain on the canvas. The hostname is its id: hostnames always contain a dot and
 * service names never do, so the two can't collide. A domain routes to at most one
 * service (`target`); a service can have many domains.
 */
export interface CanvasDomain {
  id: string;
  hostname: string;
  type: DomainType;
  target: string | null;
  /** The target service's port that receives the traffic. */
  port: number;
  /** DNS checked (mock). Generated domains are always verified. */
  verified: boolean;
}
