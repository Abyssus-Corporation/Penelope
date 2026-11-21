import type { ApiProject } from "@/api";
import { edgeId } from "./storage";
import type { CanvasService, Point, ServiceDetails, ServiceEdge } from "./types";

export const NODE_WIDTH = 240;
export const COLUMN_GAP = 96;
/** Estimated card height before React Flow has measured it (one-line name and source). */
export const DEFAULT_NODE_HEIGHT = 112;
export const ROW_GAP = 24;
/** Domain cards are narrower and shorter than service cards. */
export const DOMAIN_WIDTH = 208;
export const DEFAULT_DOMAIN_HEIGHT = 76;
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

export function toEdges(services: CanvasService[]): ServiceEdge[] {
  return services.flatMap((service) =>
    service.references.map((target) => ({
      id: edgeId(service.id, target),
      source: service.id,
      target,
    })),
  );
}

/** Services with `references` rebuilt from the current edges (list, sheet and sr text read them). */
export function withReferences(services: CanvasService[], edges: ServiceEdge[]): CanvasService[] {
  const targets = new Map<string, string[]>();
  for (const edge of edges) {
    const list = targets.get(edge.source);
    if (list) list.push(edge.target);
    else targets.set(edge.source, [edge.target]);
  }
  return services.map((service) => {
    const references = targets.get(service.id) ?? [];
    const same =
      references.length === service.references.length &&
      references.every((name, index) => name === service.references[index]);
    return same ? service : { ...service, references };
  });
}

export type LinkError = "self" | "duplicate" | "unknown";

/** A link needs two different, existing services and must not exist yet (per direction). */
export function linkError(
  edges: readonly ServiceEdge[],
  serviceIds: ReadonlySet<string>,
  source: string,
  target: string,
): LinkError | null {
  if (!serviceIds.has(source) || !serviceIds.has(target)) return "unknown";
  if (source === target) return "self";
  const id = edgeId(source, target);
  if (edges.some((edge) => edge.id === id)) return "duplicate";
  return null;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const boxesOverlap = (a: Box, b: Box, margin = 0) =>
  a.x < b.x + b.width + margin &&
  b.x < a.x + a.width + margin &&
  a.y < b.y + b.height + margin &&
  b.y < a.y + a.height + margin;

/**
 * The free card-sized spot nearest to `preferred`, searched ring by ring on a grid,
 * so a new card never lands on top of an existing one.
 */
export function findFreeSpot(
  boxes: readonly Box[],
  preferred: Point,
  size = { width: NODE_WIDTH, height: DEFAULT_NODE_HEIGHT },
): Point {
  const step = 40;
  const fits = (point: Point) =>
    !boxes.some((box) => boxesOverlap({ ...point, ...size }, box, ROW_GAP));
  for (let ring = 0; ring <= 60; ring++) {
    let best: Point | null = null;
    let bestDistance = Infinity;
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const point = { x: preferred.x + dx * step, y: preferred.y + dy * step };
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance && fits(point)) {
          best = point;
          bestDistance = distance;
        }
      }
    }
    if (best) return best;
  }
  return preferred;
}

/**
 * Layered layout: a service sits one column left of everything it references, so
 * traffic reads left to right (web → api → database). Cycles are cut at the first
 * back edge found, so every service still gets a finite depth. Within a column,
 * services are ordered by the average row of their neighbours (a few barycenter
 * sweeps), which removes most crossings without a layout dependency.
 */
export function layoutServices(
  services: CanvasService[],
  /** Measured card heights by id; rows stack on these so wrapped names never overlap. */
  heights: Readonly<Record<string, number>> = {},
  /**
   * Domains get their own column left of every service (traffic enters there), each
   * level with its target where it can be; unlinked domains go to the bottom.
   */
  domains: readonly { id: string; target: string | null }[] = [],
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

  orderLayers(
    layers.filter((layer) => layer?.length),
    services,
  );

  const positions: Record<string, { x: number; y: number }> = Object.create(null);
  let x = 0;
  for (const layer of layers) {
    if (!layer?.length) continue;
    const columns = Math.ceil(layer.length / MAX_ROWS);
    let y = 0;
    layer.forEach((id, index) => {
      const column = Math.floor(index / MAX_ROWS);
      if (index % MAX_ROWS === 0) y = 0;
      positions[id] = { x: x + column * (NODE_WIDTH + COLUMN_GAP), y };
      const height = Object.prototype.hasOwnProperty.call(heights, id) ? heights[id]! : NaN;
      y += (Number.isFinite(height) && height > 0 ? height : DEFAULT_NODE_HEIGHT) + ROW_GAP;
    });
    x += columns * (NODE_WIDTH + COLUMN_GAP);
  }

  if (domains.length) {
    const heightOf = (id: string, fallback: number) => {
      const value = Object.prototype.hasOwnProperty.call(heights, id) ? heights[id]! : NaN;
      return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    // Wanted y: centred on the target card. Stacked in that order, never overlapping.
    const wanted = domains.map((domain, index) => {
      const target = domain.target ? positions[domain.target] : undefined;
      const own = heightOf(domain.id, DEFAULT_DOMAIN_HEIGHT);
      return {
        id: domain.id,
        index,
        height: own,
        y: target ? target.y + (heightOf(domain.target!, DEFAULT_NODE_HEIGHT) - own) / 2 : Infinity,
      };
    });
    wanted.sort((a, b) => a.y - b.y || a.index - b.index);
    let next = 0;
    let bottom = -Infinity;
    for (const domain of wanted) {
      const y = Math.max(Number.isFinite(domain.y) ? domain.y : next, bottom);
      positions[domain.id] = { x: -(DOMAIN_WIDTH + COLUMN_GAP), y };
      bottom = y + domain.height + ROW_GAP;
      next = bottom;
    }
  }
  return positions;
}

function orderLayers(layers: string[][], services: CanvasService[]) {
  const neighbours = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    const list = neighbours.get(a);
    if (list) list.push(b);
    else neighbours.set(a, [b]);
  };
  for (const service of services) {
    for (const target of service.references) {
      link(service.id, target);
      link(target, service.id);
    }
  }
  const rank = new Map<string, number>();
  const rankLayer = (layer: string[]) => layer.forEach((id, index) => rank.set(id, index));
  layers.forEach(rankLayer);

  const sortBy = (layer: string[], reference: string[]) => {
    const inReference = new Set(reference);
    const score = new Map<string, number>();
    for (const id of layer) {
      const linked = (neighbours.get(id) ?? []).filter((other) => inReference.has(other));
      // Unlinked services keep their place.
      score.set(
        id,
        linked.length
          ? linked.reduce((sum, other) => sum + rank.get(other)!, 0) / linked.length
          : rank.get(id)!,
      );
    }
    // Stable: ties keep the current order.
    layer.sort((a, b) => score.get(a)! - score.get(b)! || rank.get(a)! - rank.get(b)!);
    rankLayer(layer);
  };

  for (let sweep = 0; sweep < 4; sweep++) {
    for (let i = 1; i < layers.length; i++) sortBy(layers[i]!, layers[i - 1]!);
    for (let i = layers.length - 2; i >= 0; i--) sortBy(layers[i]!, layers[i + 1]!);
  }
}
