import { GENERATED_SUFFIX, normalizeHostname, validateLabel, validatePort } from "./domains";
import { DOMAIN_TYPES, SERVICE_KINDS, SOURCE_TYPES } from "./types";
import type {
  CanvasDomain,
  DomainType,
  Point,
  ServiceEdge,
  ServiceKind,
  ServiceSource,
} from "./types";
import { validateServiceName, validateSource } from "./validation";

/** A service added on the canvas (front-end only until the services API exists). */
export interface AddedService {
  id: string;
  name: string;
  kind: ServiceKind;
  source: ServiceSource;
}

export type Positions = Record<string, Point>;

export interface StoredCanvas {
  services: AddedService[];
  /** null: the user hasn't changed any link yet, so edges come from the API's references. */
  edges: ServiceEdge[] | null;
  positions: Positions;
  /** Domains added on the canvas, each with its (optional) target service. */
  domains: CanvasDomain[];
}

/**
 * Bump on any shape change. Older versions are migrated step by step (v1 → v2 adds
 * `domains`); unknown or newer ones are ignored, never half-read.
 */
export const STORAGE_VERSION = 2;
const KEY_PREFIX = "penelope:canvas:";
/** Cards can't be dragged past this (nodeExtent); stored values are clamped to it. */
export const POSITION_LIMIT = 10_000;
const MAX_SERVICES = 200;
const MAX_EDGES = 2_000;
export const MAX_DOMAINS = 200;

export const canvasKey = (projectId: string) => `${KEY_PREFIX}${projectId}`;
export const edgeId = (source: string, target: string) => `${source}->${target}`;

const empty = (): StoredCanvas => ({
  services: [],
  edges: null,
  positions: Object.create(null),
  domains: [],
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const own = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

function coordinate(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(POSITION_LIMIT, Math.max(-POSITION_LIMIT, value));
}

function parseService(value: unknown, taken: Set<string>): AddedService | null {
  if (!isRecord(value) || typeof value.name !== "string" || value.id !== value.name) return null;
  const { name } = value;
  if (validateServiceName(name, [...taken]) || name !== name.trim()) return null;
  if (!(SERVICE_KINDS as readonly unknown[]).includes(value.kind)) return null;
  const source = value.source;
  if (!isRecord(source) || !(SOURCE_TYPES as readonly unknown[]).includes(source.type)) return null;
  const type = source.type as ServiceSource["type"];
  if (typeof source.label !== "string" || validateSource(type, source.label)) return null;
  return { id: name, name, kind: value.kind as ServiceKind, source: { type, label: source.label } };
}

function parseDomain(
  value: unknown,
  serviceIds: ReadonlySet<string>,
  taken: readonly string[],
): CanvasDomain | null {
  if (!isRecord(value) || typeof value.hostname !== "string" || value.id !== value.hostname) {
    return null;
  }
  if (!(DOMAIN_TYPES as readonly unknown[]).includes(value.type)) return null;
  const type = value.type as DomainType;
  const { hostname } = value;
  if (taken.includes(hostname) || /\s/.test(hostname)) return null;
  if (type === "generated") {
    // "<label>.penelope.local": one valid label in front of the reserved suffix.
    const suffix = `.${GENERATED_SUFFIX}`;
    if (!hostname.endsWith(suffix) || validateLabel(hostname.slice(0, -suffix.length))) return null;
  } else {
    // Stored exactly as normalized (lowercase, punycode), and never in the reserved suffix.
    const normalized = normalizeHostname(hostname, taken);
    if (normalized.error || normalized.hostname !== hostname) return null;
  }
  const { target, port } = value;
  if (target !== null && (typeof target !== "string" || !serviceIds.has(target))) return null;
  if (typeof port !== "number" || !Number.isInteger(port) || validatePort(String(port)))
    return null;
  if (typeof value.verified !== "boolean" || (type === "generated" && !value.verified)) return null;
  return {
    id: hostname,
    hostname,
    type,
    target,
    port,
    verified: value.verified,
  };
}

/** v1 had no domains; everything else is unchanged. */
export function migrateV1(raw: Record<string, unknown>): Record<string, unknown> {
  return { ...raw, version: 2, domains: [] };
}

/**
 * Validates a stored record against the services that exist today. localStorage is
 * user-editable and outlives app versions, so anything malformed is dropped: unknown
 * versions, bad shapes, names that collide, links to services that don't exist,
 * self-links and duplicates. Coordinates are clamped to ±POSITION_LIMIT.
 */
export function parseStoredCanvas(raw: unknown, baseIds: readonly string[]): StoredCanvas {
  const result = empty();
  if (!isRecord(raw)) return result;
  if (raw.version === 1) raw = migrateV1(raw);
  if (!isRecord(raw) || raw.version !== STORAGE_VERSION) return result;

  const ids = new Set(baseIds);
  if (Array.isArray(raw.services)) {
    for (const value of raw.services.slice(0, MAX_SERVICES)) {
      const service = parseService(value, ids);
      if (!service) continue;
      ids.add(service.id);
      result.services.push(service);
    }
  }

  if (Array.isArray(raw.edges)) {
    const seen = new Set<string>();
    result.edges = [];
    for (const value of raw.edges.slice(0, MAX_EDGES)) {
      if (!isRecord(value)) continue;
      const { source, target } = value;
      if (typeof source !== "string" || typeof target !== "string") continue;
      if (source === target || !ids.has(source) || !ids.has(target)) continue;
      const id = edgeId(source, target);
      if (seen.has(id)) continue;
      seen.add(id);
      result.edges.push({ id, source, target });
    }
  }

  const serviceIds = new Set(ids);
  if (Array.isArray(raw.domains)) {
    const hostnames: string[] = [];
    for (const value of raw.domains.slice(0, MAX_DOMAINS)) {
      const domain = parseDomain(value, serviceIds, hostnames);
      if (!domain) continue;
      hostnames.push(domain.id);
      result.domains.push(domain);
    }
  }

  if (isRecord(raw.positions)) {
    const positions = raw.positions;
    for (const id of [...ids, ...result.domains.map((domain) => domain.id)]) {
      if (!own(positions, id)) continue;
      const value = positions[id];
      if (!isRecord(value)) continue;
      const x = coordinate(value.x);
      const y = coordinate(value.y);
      if (x !== null && y !== null) result.positions[id] = { x, y };
    }
  }
  return result;
}

export function loadCanvas(projectId: string, baseIds: readonly string[]): StoredCanvas {
  try {
    const raw = window.localStorage.getItem(canvasKey(projectId));
    return raw ? parseStoredCanvas(JSON.parse(raw), baseIds) : empty();
  } catch {
    // Blocked storage or bad JSON: start from the API's data.
    return empty();
  }
}

export function saveCanvas(projectId: string, canvas: StoredCanvas): void {
  try {
    window.localStorage.setItem(
      canvasKey(projectId),
      JSON.stringify({ version: STORAGE_VERSION, ...canvas }),
    );
  } catch {
    // Storage full or blocked (private mode): changes just won't persist.
  }
}
