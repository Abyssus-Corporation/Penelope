import type { ApiProject } from "@/api";
import type { CanvasService, ServiceDetails } from "./types";

export const NODE_WIDTH = 240;
const COLUMN_GAP = 96;
const ROW_HEIGHT = 136;
/** Long layers wrap into extra columns so 30+ services stay roughly screen-shaped. */
const MAX_ROWS = 6;

/**
 * Merges the API's services with optional details. References to services that
 * don't exist, and self-references, are dropped so edges always have both ends.
 */
export function toCanvasServices(
  project: ApiProject,
  details: Record<string, ServiceDetails> | undefined,
): CanvasService[] {
  const names = new Set(project.services.map((service) => service.name));
  return project.services.map((service) => {
    const extra =
      details && Object.prototype.hasOwnProperty.call(details, service.name)
        ? details[service.name]
        : undefined;
    return {
      id: service.name,
      name: service.name,
      status: service.status,
      kind: extra?.kind ?? "service",
      source: extra?.source ?? null,
      deployedAt: extra?.deployedAt ?? null,
      references: [...new Set(extra?.references ?? [])].filter(
        (name) => name !== service.name && names.has(name),
      ),
    };
  });
}

export interface ServiceEdge {
  id: string;
  source: string;
  target: string;
}

export function toEdges(services: CanvasService[]): ServiceEdge[] {
  return services.flatMap((service) =>
    service.references.map((target) => ({
      id: `${service.id}->${target}`,
      source: service.id,
      target,
    })),
  );
}

/**
 * Layered layout: a service sits one column left of everything it references, so
 * traffic reads left to right (web → api → database). Cycles are cut at the first
 * back edge found, so every service still gets a finite depth.
 */
export function layoutServices(
  services: CanvasService[],
): Record<string, { x: number; y: number }> {
  const byId = new Map(services.map((service) => [service.id, service]));
  const height = new Map<string, number>();
  const visiting = new Set<string>();

  // Height = longest reference chain below a service; sinks (databases) are 0.
  const measure = (id: string): number => {
    const known = height.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return -1; // back edge: ignore it
    visiting.add(id);
    let value = 0;
    for (const target of byId.get(id)?.references ?? []) {
      value = Math.max(value, measure(target) + 1);
    }
    visiting.delete(id);
    height.set(id, value);
    return value;
  };
  services.forEach((service) => measure(service.id));

  const maxHeight = Math.max(0, ...height.values());
  const layers: string[][] = [];
  for (const service of services) {
    const column = maxHeight - (height.get(service.id) ?? 0);
    (layers[column] ??= []).push(service.id);
  }

  const positions: Record<string, { x: number; y: number }> = Object.create(null);
  let x = 0;
  for (const layer of layers) {
    if (!layer) continue;
    const columns = Math.ceil(layer.length / MAX_ROWS);
    layer.forEach((id, index) => {
      const column = Math.floor(index / MAX_ROWS);
      const row = index % MAX_ROWS;
      positions[id] = { x: x + column * (NODE_WIDTH + COLUMN_GAP), y: row * ROW_HEIGHT };
    });
    x += columns * (NODE_WIDTH + COLUMN_GAP);
  }
  return positions;
}
