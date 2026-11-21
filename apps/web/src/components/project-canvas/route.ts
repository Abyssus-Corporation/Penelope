import type { Box } from "./graph";
import type { Point } from "./types";

/**
 * Orthogonal edge routing. Every link leaves its source handle to the right, runs on
 * horizontal and vertical lines that keep clear of every card (the free lanes between
 * columns and the corridors between rows), and enters its target handle from the left.
 *
 * How: a sparse grid made of the lines just outside each card and the middles of the
 * gaps between cards, searched with A* (length + a cost per bend). Parallel segments
 * that share a lane are then spread apart a few pixels so they don't draw on top of each
 * other. Corners are rounded when the path is drawn.
 */

/** Grid lines sit this far outside each card. */
export const CLEARANCE = 10;
/** A routed segment never comes closer than this to a card it doesn't start or end on. */
export const MARGIN = 5;
/** Horizontal stub out of the source handle and into the target handle. */
export const STUB = 20;
export const RADIUS = 8;
/** Distance between parallel segments that share a lane. */
export const SPREAD = 5;
const BEND = 36;
/** First try a search window this much larger than the two ends; then the whole canvas. */
const WINDOW = 200;

export interface RouteResult {
  points: Point[];
  /** No route around the cards was found (cards packed edge to edge): a plain Z shape. */
  fallback: boolean;
  /** Needed the whole canvas (not just the cards near its ends) to find a way. */
  wide: boolean;
}

interface Ends {
  /** Leave `start` to the right through a stub (an edge's source handle). */
  startStub: boolean;
  /** Enter `end` from the left through a stub (a target handle); false: a free point. */
  endStub: boolean;
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

/** Strictly inside `box` grown by `margin`. */
function inside(x: number, y: number, box: Box, margin: number) {
  return (
    x > box.x - margin &&
    x < box.x + box.width + margin &&
    y > box.y - margin &&
    y < box.y + box.height + margin
  );
}

/** Does the axis-aligned segment a→b cut `box` grown by `margin`? */
export function segmentHits(a: Point, b: Point, box: Box, margin: number) {
  const x1 = Math.min(a.x, b.x);
  const x2 = Math.max(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const y2 = Math.max(a.y, b.y);
  return (
    x2 > box.x - margin &&
    x1 < box.x + box.width + margin &&
    y2 > box.y - margin &&
    y1 < box.y + box.height + margin
  );
}

function uniqueSorted(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const out: number[] = [];
  for (const value of sorted)
    if (!out.length || !near(out[out.length - 1]!, value)) out.push(value);
  return out;
}

/** The card edges, the lines just outside them, and the middles of the gaps between. */
function gridLines(edges: number[], extra: number[]) {
  const sorted = uniqueSorted(edges);
  const lines = [...extra];
  for (let i = 0; i < sorted.length; i++) {
    lines.push(sorted[i]! - CLEARANCE, sorted[i]! + CLEARANCE);
    if (i > 0) lines.push((sorted[i - 1]! + sorted[i]!) / 2);
  }
  return uniqueSorted(lines);
}

/** A tiny binary heap of [priority, value]. */
class Heap {
  private items: [number, number][] = [];
  get size() {
    return this.items.length;
  }
  push(priority: number, value: number) {
    const items = this.items;
    items.push([priority, value]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent]![0] <= items[i]![0]) break;
      [items[parent], items[i]] = [items[i]!, items[parent]!];
      i = parent;
    }
  }
  pop(): number {
    const items = this.items;
    const top = items[0]![1];
    const last = items.pop()!;
    if (items.length) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && items[l]![0] < items[m]![0]) m = l;
        if (r < items.length && items[r]![0] < items[m]![0]) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i]!, items[m]!];
        i = m;
      }
    }
    return top;
  }
}

// Directions: 0 right, 1 left, 2 down, 3 up.
const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];
const OPPOSITE = [1, 0, 3, 2];

/** A* over the grid from `from` (heading right) to `to`. Null when there is no way. */
function search(
  from: Point,
  to: Point,
  boxes: readonly Box[],
  endStub: boolean,
  window: number,
): Point[] | null {
  const minX = Math.min(from.x, to.x) - window;
  const maxX = Math.max(from.x, to.x) + window;
  const minY = Math.min(from.y, to.y) - window;
  const maxY = Math.max(from.y, to.y) + window;
  const local = boxes.filter(
    (box) =>
      box.x + box.width + CLEARANCE >= minX &&
      box.x - CLEARANCE <= maxX &&
      box.y + box.height + CLEARANCE >= minY &&
      box.y - CLEARANCE <= maxY,
  );
  const inWindow = (value: number, lo: number, hi: number) => value >= lo && value <= hi;
  const xs = gridLines(
    local.flatMap((box) => [box.x, box.x + box.width]),
    [from.x, to.x],
  ).filter((x) => inWindow(x, minX - CLEARANCE, maxX + CLEARANCE));
  const ys = gridLines(
    local.flatMap((box) => [box.y, box.y + box.height]),
    [from.y, to.y],
  ).filter((y) => inWindow(y, minY - CLEARANCE, maxY + CLEARANCE));
  const nx = xs.length;
  const ny = ys.length;
  const startI = xs.findIndex((x) => near(x, from.x));
  const startJ = ys.findIndex((y) => near(y, from.y));
  const goalI = xs.findIndex((x) => near(x, to.x));
  const goalJ = ys.findIndex((y) => near(y, to.y));
  if (startI < 0 || startJ < 0 || goalI < 0 || goalJ < 0) return null;

  // Boxes that matter on each row / column (their band, grown by MARGIN, holds the line).
  const rowBoxes = ys.map((y) =>
    local.filter((b) => y > b.y - MARGIN && y < b.y + b.height + MARGIN),
  );
  const colBoxes = xs.map((x) =>
    local.filter((b) => x > b.x - MARGIN && x < b.x + b.width + MARGIN),
  );
  const start = startJ * nx + startI;
  const goal = goalJ * nx + goalI;
  const open = (i: number, j: number) => {
    const index = j * nx + i;
    if (index === start || index === goal) return true;
    return !rowBoxes[j]!.some((b) => inside(xs[i]!, ys[j]!, b, MARGIN));
  };
  const step = (i: number, j: number, d: number) => {
    const i2 = i + DX[d]!;
    const j2 = j + DY[d]!;
    if (i2 < 0 || j2 < 0 || i2 >= nx || j2 >= ny || !open(i2, j2)) return -1;
    const a = { x: xs[i]!, y: ys[j]! };
    const b = { x: xs[i2]!, y: ys[j2]! };
    const blockers = d < 2 ? rowBoxes[j]! : colBoxes[i]!;
    if (blockers.some((box) => segmentHits(a, b, box, MARGIN))) return -1;
    return j2 * nx + i2;
  };

  const best = new Float64Array(nx * ny * 4).fill(Infinity);
  const previous = new Int32Array(nx * ny * 4).fill(-1);
  const heap = new Heap();
  const h = (index: number) =>
    Math.abs(xs[index % nx]! - to.x) + Math.abs(ys[Math.floor(index / nx)]! - to.y);
  best[start * 4] = 0;
  heap.push(h(start), start * 4);
  let found = -1;
  while (heap.size) {
    const state = heap.pop();
    const node = state >> 2;
    const dir = state & 3;
    const cost = best[state]!;
    if (node === goal) {
      // Entering a target handle: must not arrive heading left (a U-turn into the stub).
      if (!endStub || dir !== 1) {
        found = state;
        break;
      }
      continue;
    }
    const i = node % nx;
    const j = Math.floor(node / nx);
    for (let d = 0; d < 4; d++) {
      if (d === OPPOSITE[dir]) continue;
      const next = step(i, j, d);
      if (next < 0) continue;
      const length =
        Math.abs(xs[next % nx]! - xs[i]!) + Math.abs(ys[Math.floor(next / nx)]! - ys[j]!);
      let total = cost + length + (d === dir ? 0 : BEND);
      if (next === goal && endStub && d !== 0) total += BEND;
      const key = next * 4 + d;
      if (total < best[key]!) {
        best[key] = total;
        previous[key] = state;
        heap.push(total + h(next), key);
      }
    }
  }
  if (found < 0) return null;
  const out: Point[] = [];
  for (let state = found; state >= 0; state = previous[state]!) {
    const node = state >> 2;
    out.push({ x: xs[node % nx]!, y: ys[Math.floor(node / nx)]! });
  }
  return out.reverse();
}

/** Drops repeated points and the middle of straight runs. */
export function simplify(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && near(last.x, point.x) && near(last.y, point.y)) continue;
    const before = out[out.length - 2];
    if (
      before &&
      last &&
      ((near(before.x, last.x) && near(last.x, point.x)) ||
        (near(before.y, last.y) && near(last.y, point.y)))
    ) {
      out[out.length - 1] = point;
      continue;
    }
    out.push(point);
  }
  return out;
}

/**
 * The route from `start` to `end` around `boxes` (every card, the two ends included:
 * the stubs touch them only at the handles).
 */
export function routeOrthogonal(
  start: Point,
  end: Point,
  boxes: readonly Box[],
  { startStub, endStub }: Ends = { startStub: true, endStub: true },
): RouteResult {
  const from = startStub ? { x: start.x + STUB, y: start.y } : start;
  const to = endStub ? { x: end.x - STUB, y: end.y } : end;
  const close = search(from, to, boxes, endStub, WINDOW);
  if (close) return { points: simplify([start, ...close, end]), fallback: false, wide: false };
  const far = search(from, to, boxes, endStub, 1e5);
  if (far) return { points: simplify([start, ...far, end]), fallback: false, wide: true };
  const middle = (from.x + to.x) / 2;
  return {
    points: simplify([start, from, { x: middle, y: from.y }, { x: middle, y: to.y }, to, end]),
    fallback: true,
    wide: true,
  };
}

/**
 * Spreads segments of different routes that run along the same lane (same x for
 * vertical, same y for horizontal, overlapping spans) a few pixels apart, keeping each
 * moved segment and its neighbours clear of the cards. The first and last segment of a
 * route (the handle stubs) never move, so every route still starts and ends on its handles.
 */
export function spreadParallel(routes: Map<string, Point[]>, boxes: readonly Box[]) {
  type Segment = {
    id: string;
    index: number;
    vertical: boolean;
    at: number;
    lo: number;
    hi: number;
  };
  const segments: Segment[] = [];
  for (const [id, points] of routes) {
    for (let index = 1; index + 1 < points.length - 1; index++) {
      const a = points[index]!;
      const b = points[index + 1]!;
      const vertical = near(a.x, b.x);
      segments.push({
        id,
        index,
        vertical,
        at: vertical ? a.x : a.y,
        lo: vertical ? Math.min(a.y, b.y) : Math.min(a.x, b.x),
        hi: vertical ? Math.max(a.y, b.y) : Math.max(a.x, b.x),
      });
    }
  }
  const lanes = new Map<string, Segment[]>();
  for (const segment of segments) {
    const key = `${segment.vertical ? "v" : "h"}${Math.round(segment.at)}`;
    const lane = lanes.get(key);
    if (lane) lane.push(segment);
    else lanes.set(key, [segment]);
  }
  const out = new Map<string, Point[]>();
  for (const [id, points] of routes)
    out.set(
      id,
      points.map((point) => ({ ...point })),
    );
  const clear = (points: Point[], index: number) => {
    for (let k = Math.max(0, index - 1); k <= Math.min(points.length - 2, index + 1); k++) {
      const a = points[k]!;
      const b = points[k + 1]!;
      // The stubs start and end on their own cards; only test them against others.
      const end = k === 0 || k === points.length - 2;
      for (const box of boxes) {
        const margin = end ? -1 : MARGIN - 1;
        if (segmentHits(a, b, box, margin)) return false;
      }
    }
    return true;
  };
  for (const lane of lanes.values()) {
    if (lane.length < 2) continue;
    // Groups of segments whose spans overlap on this lane.
    lane.sort((a, b) => a.lo - b.lo);
    let group: Segment[] = [];
    let groupHi = -Infinity;
    const flush = () => {
      const routesInGroup = new Set(group.map((segment) => segment.id));
      if (routesInGroup.size > 1) {
        // Stable order: by route id, so the same graph always draws the same way.
        group.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.index - b.index));
        group.forEach((segment, k) => {
          const wanted = (k - (group.length - 1) / 2) * SPREAD;
          const points = out.get(segment.id)!;
          const axis = segment.vertical ? "x" : "y";
          for (let offset = wanted; Math.abs(offset) >= 1; offset /= 2) {
            const a = points[segment.index]!;
            const b = points[segment.index + 1]!;
            const before = [a[axis], b[axis]] as const;
            a[axis] = segment.at + offset;
            b[axis] = segment.at + offset;
            if (clear(points, segment.index)) return;
            a[axis] = before[0];
            b[axis] = before[1];
          }
        });
      }
      group = [];
      groupHi = -Infinity;
    };
    for (const segment of lane) {
      if (segment.lo >= groupHi) flush();
      group.push(segment);
      groupHi = Math.max(groupHi, segment.hi);
    }
    flush();
  }
  return out;
}

/** SVG path of an orthogonal polyline with corners rounded (radius ≤ half each side). */
export function roundedPath(points: readonly Point[]): string {
  const clean = simplify(points);
  if (clean.length === 0) return "";
  let path = `M${clean[0]!.x},${clean[0]!.y}`;
  for (let i = 1; i < clean.length - 1; i++) {
    const prev = clean[i - 1]!;
    const corner = clean[i]!;
    const next = clean[i + 1]!;
    const r = Math.min(
      RADIUS,
      Math.hypot(corner.x - prev.x, corner.y - prev.y) / 2,
      Math.hypot(next.x - corner.x, next.y - corner.y) / 2,
    );
    const toward = (to: Point) => {
      const length = Math.hypot(to.x - corner.x, to.y - corner.y) || 1;
      return {
        x: corner.x + ((to.x - corner.x) / length) * r,
        y: corner.y + ((to.y - corner.y) / length) * r,
      };
    };
    const a = toward(prev);
    const b = toward(next);
    path += ` L${a.x},${a.y} Q${corner.x},${corner.y} ${b.x},${b.y}`;
  }
  const last = clean[clean.length - 1]!;
  return `${path} L${last.x},${last.y}`;
}

/** The point halfway along the polyline (where an edge's remove button sits). */
export function midpoint(points: readonly Point[]): Point {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.abs(points[i]!.x - points[i - 1]!.x) + Math.abs(points[i]!.y - points[i - 1]!.y);
  }
  let left = total / 2;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (left <= length && length > 0) {
      const t = left / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    left -= length;
  }
  return points[0] ?? { x: 0, y: 0 };
}

/** Handle points on a card: the source on its right side, the target on its left. */
export const sourceHandle = (box: Box): Point => ({
  x: box.x + box.width,
  y: box.y + box.height / 2,
});
export const targetHandle = (box: Box): Point => ({ x: box.x, y: box.y + box.height / 2 });

const boxKey = (box: Box) =>
  `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}`;

export type RouteCache = Map<string, { result: RouteResult; allKey: string }>;

/**
 * Routes every edge, then spreads shared lanes. `cache` keeps each edge's raw route
 * keyed by its two cards and every card near them, so dragging one card re-routes only
 * the edges around it (70 services stay smooth).
 */
export function routeAll(
  edges: readonly { id: string; source: string; target: string }[],
  boxes: ReadonlyMap<string, Box>,
  cache: RouteCache = new Map(),
): { routes: Map<string, Point[]>; fallbacks: string[] } {
  const all = [...boxes.values()];
  const allKey = all.map(boxKey).join(";");
  const raw = new Map<string, Point[]>();
  const fallbacks: string[] = [];
  for (const edge of edges) {
    const source = boxes.get(edge.source);
    const target = boxes.get(edge.target);
    if (!source || !target) continue;
    const start = sourceHandle(source);
    const end = targetHandle(target);
    const lo = { x: Math.min(start.x, end.x) - WINDOW, y: Math.min(start.y, end.y) - WINDOW };
    const hi = { x: Math.max(start.x, end.x) + WINDOW, y: Math.max(start.y, end.y) + WINDOW };
    const nearby = all
      .filter((b) => b.x + b.width >= lo.x && b.x <= hi.x && b.y + b.height >= lo.y && b.y <= hi.y)
      .map(boxKey)
      .join(";");
    const key = `${boxKey(source)}>${boxKey(target)}|${nearby}`;
    const hit = cache.get(key);
    // A route that needed the whole canvas depends on every card, not just the nearby ones.
    let result = hit && (!hit.result.wide || hit.allKey === allKey) ? hit.result : undefined;
    if (!result) {
      result = routeOrthogonal(start, end, all);
      cache.set(key, { result, allKey });
    }
    if (result.fallback) fallbacks.push(edge.id);
    raw.set(edge.id, result.points);
  }
  if (cache.size > 4000) cache.clear();
  return { routes: spreadParallel(raw, all), fallbacks };
}
