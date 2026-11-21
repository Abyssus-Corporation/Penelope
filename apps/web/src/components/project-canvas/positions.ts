export type Position = { x: number; y: number };
export type Positions = Record<string, Position>;

const KEY_PREFIX = "penelope:canvas-positions:";
/** Anything further out than this is corrupt or hostile, not a real drag. */
const LIMIT = 1_000_000;

export const positionsKey = (projectId: string) => `${KEY_PREFIX}${projectId}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= LIMIT;
}

/**
 * Reads saved positions for a project. localStorage is user-editable and shared
 * across versions, so only finite x/y pairs for services that exist today are
 * kept; anything else (bad JSON, wrong shapes, unknown ids) is ignored.
 */
export function loadPositions(projectId: string, serviceIds: readonly string[]): Positions {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(positionsKey(projectId));
  } catch {
    return {};
  }
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isRecord(parsed)) return {};

  // No prototype, so a service called "__proto__" can't reach Object.prototype.
  const positions: Positions = Object.create(null);
  for (const id of serviceIds) {
    if (!Object.prototype.hasOwnProperty.call(parsed, id)) continue;
    const value = parsed[id];
    if (isRecord(value) && isCoordinate(value.x) && isCoordinate(value.y)) {
      positions[id] = { x: value.x, y: value.y };
    }
  }
  return positions;
}

export function savePositions(projectId: string, positions: Positions): void {
  try {
    window.localStorage.setItem(positionsKey(projectId), JSON.stringify(positions));
  } catch {
    // Storage full or blocked (private mode): positions just won't persist.
  }
}
