import { describe, expect, it } from "vitest";
import { CANVAS_FIXTURE_PROJECTS, SERVICE_DETAILS } from "./fixtures";
import {
  DEFAULT_NODE_HEIGHT,
  NODE_WIDTH,
  layoutServices,
  toCanvasServices,
  toEdges,
  type Box,
} from "./graph";
import {
  RADIUS,
  SPREAD,
  midpoint,
  roundedPath,
  routeAll,
  routeOrthogonal,
  segmentHits,
  sourceHandle,
  targetHandle,
} from "./route";
import type { Point } from "./types";

/** Inflate for cards a segment doesn't start or end on. */
const MARGIN = 4;

function expectAxisAligned(points: readonly Point[]) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    expect(a.x === b.x || a.y === b.y, `segment ${i} ${JSON.stringify([a, b])}`).toBe(true);
  }
}

/** No segment cuts a card: others grown by MARGIN; its own two cards only at the handles. */
function expectClear(points: readonly Point[], boxes: readonly Box[], ends: readonly Box[] = []) {
  const last = points.length - 2;
  for (let i = 0; i <= last; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    for (const box of boxes) {
      const own = ends.includes(box);
      // The stubs touch their own card's side at the handle; shrink it a pixel for them.
      const margin = own && (i === 0 || i === last) ? -1 : MARGIN;
      expect(segmentHits(a, b, box, margin), `segment ${i} vs ${JSON.stringify(box)}`).toBe(false);
    }
  }
}

const box = (x: number, y: number, height = DEFAULT_NODE_HEIGHT): Box => ({
  x,
  y,
  width: NODE_WIDTH,
  height,
});

function route(source: Box, target: Box, others: Box[]) {
  const all = [source, target, ...others];
  const result = routeOrthogonal(sourceHandle(source), targetHandle(target), all);
  expect(result.fallback).toBe(false);
  expectAxisAligned(result.points);
  expectClear(result.points, all, [source, target]);
  return result.points;
}

describe("routeOrthogonal", () => {
  it("a straight neighbour link is one horizontal segment, handle to handle", () => {
    const points = route(box(0, 0), box(336, 0), []);
    expect(points).toEqual([
      { x: 240, y: 56 },
      { x: 336, y: 56 },
    ]);
  });

  it("leaves the source and enters the target horizontally, with steps in between", () => {
    const points = route(box(0, 0), box(336, 200), []);
    expect(points[0]!.y).toBe(points[1]!.y);
    expect(points.at(-1)!.y).toBe(points.at(-2)!.y);
    expect(points[1]!.x).toBeGreaterThan(points[0]!.x);
    expect(points.at(-2)!.x).toBeLessThan(points.at(-1)!.x);
  });

  it("goes around a card in the column it crosses (billing → pg past api)", () => {
    const api = box(336, 0, 131);
    const billing = box(0, 155, 131);
    const pg = box(672, 0);
    route(billing, pg, [api]);
  });

  it("routes a back-edge (cycle) around both its cards", () => {
    const orders = box(0, 0);
    const notifier = box(336, 0);
    const points = route(notifier, orders, []);
    // Out to the right of notifier, over or under both, back in from the left of orders.
    expect(Math.max(...points.map((p) => p.x))).toBeGreaterThan(576);
    expect(Math.min(...points.map((p) => p.x))).toBeLessThan(0);
  });

  it("routes a same-column link through the corridor between the two cards", () => {
    const top = box(0, 0);
    const bottom = box(0, 136);
    const points = route(top, bottom, []);
    const corridor = points.filter((p) => p.y > 112 && p.y < 136);
    expect(corridor.length).toBeGreaterThan(0);
  });

  it("goes around a full column of cards in the way", () => {
    const column = Array.from({ length: 5 }, (_, i) => box(336, i * 136));
    route(box(0, 272), box(672, 272), column);
  });

  it("only falls back (a plain Z) when the cards leave no way through", () => {
    // The target sits inside a ring of cards packed edge to edge.
    const target = box(1000, 1000);
    const ring = [
      box(760, 880, 360),
      box(1240, 880, 360),
      { x: 760, y: 760, width: 720, height: 120 },
      { x: 760, y: 1240, width: 720, height: 120 },
    ];
    const result = routeOrthogonal(sourceHandle(box(0, 0)), targetHandle(target), [
      target,
      ...ring,
    ]);
    expect(result.fallback).toBe(true);
    expectAxisAligned(result.points);
  });
});

describe("routeAll", () => {
  it("spreads parallel segments that share a lane, keeping them clear of cards", () => {
    // Two sources stacked on the left, two targets low on the right: both links drop
    // through the same gap between the columns.
    const boxes = new Map<string, Box>([
      ["a", box(0, 0)],
      ["b", box(0, 136)],
      ["c", box(336, 408)],
      ["d", box(336, 544)],
    ]);
    const { routes } = routeAll(
      [
        { id: "a->c", source: "a", target: "c" },
        { id: "b->d", source: "b", target: "d" },
      ],
      boxes,
    );
    const lane = (points: Point[]) => {
      const i = points.findIndex((p, k) => k > 0 && p.x === points[k - 1]!.x);
      return points[i]!.x;
    };
    const ac = routes.get("a->c")!;
    const bd = routes.get("b->d")!;
    for (const [id, points] of [
      ["a->c", ac],
      ["b->d", bd],
    ] as const) {
      expectAxisAligned(points);
      const [source, target] = id.split("->").map((key) => boxes.get(key)!);
      expectClear(points, [...boxes.values()], [source!, target!]);
    }
    // Same gap between the columns, SPREAD apart, both clear of the cards around it.
    expect(Math.abs(lane(ac) - lane(bd))).toBeCloseTo(SPREAD);
    for (const x of [lane(ac), lane(bd)]) {
      expect(x).toBeGreaterThan(240 + MARGIN);
      expect(x).toBeLessThan(336 - MARGIN);
    }
  });

  it("routes the 70-service graph with no fallback, nothing over a card, quickly", () => {
    const project = CANVAS_FIXTURE_PROJECTS.find((p) => p.id === "fleet-xl")!;
    const services = toCanvasServices(project, SERVICE_DETAILS["fleet-xl"]!);
    const layout = layoutServices(services);
    const boxes = new Map(Object.entries(layout).map(([id, p]) => [id, box(p.x, p.y)] as const));
    const edges = toEdges(services);
    const started = performance.now();
    const { routes, fallbacks } = routeAll(edges, boxes);
    const elapsed = performance.now() - started;
    expect(fallbacks).toEqual([]);
    expect(routes.size).toBe(edges.length);
    for (const edge of edges) {
      const points = routes.get(edge.id)!;
      expectAxisAligned(points);
      expectClear(points, [...boxes.values()], [boxes.get(edge.source)!, boxes.get(edge.target)!]);
    }
    expect(elapsed).toBeLessThan(1500);
    // A second pass with the same geometry is served from the cache.
    const cache = new Map();
    routeAll(edges, boxes, cache);
    const again = performance.now();
    routeAll(edges, boxes, cache);
    expect(performance.now() - again).toBeLessThan(elapsed);
  });
});

describe("drawing", () => {
  it("rounds corners with radius ≤ 8, and ≤ half the shorter side", () => {
    const path = roundedPath([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 6 },
      { x: 200, y: 6 },
    ]);
    expect(path).toBe("M0,0 L97,0 Q100,0 100,3 L100,3 Q100,6 103,6 L200,6");
    const wide = roundedPath([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ]);
    expect(wide).toBe(`M0,0 L${100 - RADIUS},0 Q100,0 100,${RADIUS} L100,100`);
  });

  it("puts the remove button halfway along the path, on a segment", () => {
    expect(
      midpoint([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ]),
    ).toEqual({ x: 100, y: 0 });
    expect(
      midpoint([
        { x: 0, y: 0 },
        { x: 60, y: 0 },
        { x: 60, y: 20 },
        { x: 100, y: 20 },
      ]),
    ).toEqual({ x: 60, y: 0 });
  });
});
