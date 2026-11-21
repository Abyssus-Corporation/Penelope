import { describe, expect, it } from "vitest";
import type { ApiProject } from "@/api";
import { CANVAS_FIXTURE_PROJECTS, SERVICE_DETAILS } from "./fixtures";
import {
  DEFAULT_DOMAIN_HEIGHT,
  DEFAULT_NODE_HEIGHT,
  DOMAIN_WIDTH,
  NODE_WIDTH,
  ROW_GAP,
  boxesOverlap,
  findFreeSpot,
  layoutServices,
  linkError,
  toCanvasServices,
  toEdges,
  withReferences,
} from "./graph";
import type { CanvasService } from "./types";

const service = (id: string, references: string[] = []): CanvasService => ({
  id,
  name: id,
  status: "running",
  kind: "service",
  source: null,
  deployedAt: null,
  references,
});

const fixture = (id: string) => {
  const project = CANVAS_FIXTURE_PROJECTS.find((p) => p.id === id)!;
  return toCanvasServices(project, SERVICE_DETAILS[id]);
};

describe("service graph", () => {
  it("drops self, duplicate and dangling references", () => {
    const project: ApiProject = {
      id: "x",
      name: "x",
      deployedAt: "",
      repo: null,
      services: [
        { name: "a", status: "running" },
        { name: "b", status: "running" },
      ],
    };
    const [a] = toCanvasServices(project, {
      a: { kind: "web", source: null, deployedAt: null, references: ["a", "b", "b", "gone"] },
    });
    expect(a!.references).toEqual(["b"]);
  });

  it("falls back to name + status when there are no details (production)", () => {
    const [service] = toCanvasServices(
      {
        id: "x",
        name: "x",
        deployedAt: "",
        repo: null,
        services: [{ name: "constructor", status: "failed" }],
      },
      undefined,
    );
    expect(service).toMatchObject({
      kind: "service",
      source: null,
      deployedAt: null,
      references: [],
    });
  });

  it("lays out references left to right", () => {
    const project = {
      id: "acme-production",
      name: "a",
      deployedAt: "",
      repo: null,
      services: ["web", "api", "postgres", "redis"].map((name) => ({
        name,
        status: "running" as const,
      })),
    };
    const positions = layoutServices(toCanvasServices(project, SERVICE_DETAILS["acme-production"]));
    expect(positions.web!.x).toBeLessThan(positions.api!.x);
    expect(positions.api!.x).toBeLessThan(positions.postgres!.x);
    expect(positions.postgres!.x).toBe(positions.redis!.x);
  });

  it("terminates on cycles and still places every service", () => {
    const services = fixture("loop");
    const positions = layoutServices(services);
    expect(Object.keys(positions).sort()).toEqual(services.map((s) => s.id).sort());
    expect(toEdges(services).map((e) => e.id)).toContain("inventory->orders");
  });

  it("places 30+ services without overlaps", () => {
    const services = fixture("fleet");
    expect(services.length).toBeGreaterThanOrEqual(30);
    const spots = Object.values(layoutServices(services)).map(({ x, y }) => `${x},${y}`);
    expect(new Set(spots).size).toBe(services.length);
    expect(Math.min(...Object.values(layoutServices(services)).map((p) => p.x))).toBe(0);
    expect(NODE_WIDTH).toBeGreaterThan(0);
  });

  it("handles a project with no edges", () => {
    const services = fixture("islands");
    expect(toEdges(services)).toEqual([]);
    expect(new Set(Object.values(layoutServices(services)).map((p) => p.x)).size).toBe(1);
  });

  it("stacks rows on measured heights so tall (wrapped) cards never overlap", () => {
    const services = fixture("islands"); // one column, four services
    const ids = services.map((s) => s.id);
    const heights = { [ids[0]!]: 171, [ids[1]!]: 97, [ids[2]!]: Number.NaN, [ids[3]!]: 120 };
    const positions = layoutServices(services, heights);
    const ys = ids.map((id) => positions[id]!.y);
    expect(ys).toEqual([
      0,
      171 + ROW_GAP,
      171 + 97 + 2 * ROW_GAP,
      // NaN (unmeasured) falls back to the estimate.
      171 + 97 + DEFAULT_NODE_HEIGHT + 3 * ROW_GAP,
    ]);
    for (let i = 1; i < ids.length; i++) {
      const above = ids[i - 1]!;
      const height = Number.isFinite(heights[above]) ? heights[above]! : DEFAULT_NODE_HEIGHT;
      expect(positions[ids[i]!]!.y).toBeGreaterThanOrEqual(positions[above]!.y + height);
    }
  });

  it("restarts the stack in each wrapped column", () => {
    const services = fixture("fleet");
    const tall = Object.fromEntries(services.map((s) => [s.id, 200]));
    const positions = layoutServices(services, tall);
    const byX = new Map<number, number[]>();
    for (const { x, y } of Object.values(positions)) byX.set(x, [...(byX.get(x) ?? []), y]);
    for (const ys of byX.values()) {
      expect(Math.min(...ys)).toBe(0);
      expect(Math.max(...ys)).toBeLessThanOrEqual(5 * (200 + ROW_GAP));
    }
  });

  it("auto-arrange never overlaps cards, whatever their measured heights", () => {
    const northwind = toCanvasServices(
      {
        id: "n",
        name: "n",
        deployedAt: "",
        repo: null,
        services: Object.keys(
          SERVICE_DETAILS["northwind-industries-holdings-customer-portal-production-eu-west"]!,
        ).map((name) => ({ name, status: "running" as const })),
      },
      SERVICE_DETAILS["northwind-industries-holdings-customer-portal-production-eu-west"],
    );
    for (const services of [fixture("fleet"), fixture("loop"), fixture("islands"), northwind]) {
      // Deterministic spread of real card heights: one-line to clamped two-line names.
      const heights = Object.fromEntries(services.map((s, i) => [s.id, 97 + ((i * 37) % 70)]));
      const positions = layoutServices(services, heights);
      const boxes = services.map((s) => ({
        id: s.id,
        ...positions[s.id]!,
        width: NODE_WIDTH,
        height: heights[s.id]!,
      }));
      for (const [i, a] of boxes.entries()) {
        for (const b of boxes.slice(i + 1)) {
          expect(boxesOverlap(a, b), `${a.id} overlaps ${b.id}`).toBe(false);
        }
      }
    }
  });

  it("orders each column by its neighbours, so simple crossings untangle", () => {
    // a → d and b → c; listed c before d, a naive layout crosses the two edges.
    const positions = layoutServices([
      service("a", ["d"]),
      service("b", ["c"]),
      service("c"),
      service("d"),
    ]);
    expect(positions.a!.y).toBeLessThan(positions.b!.y);
    expect(positions.d!.y).toBeLessThan(positions.c!.y);
  });
});

describe("link rules", () => {
  const ids = new Set(["web", "api", "db"]);
  const edges = [{ id: "web->api", source: "web", target: "api" }];

  it("accepts a new link between two services", () => {
    expect(linkError(edges, ids, "api", "db")).toBeNull();
    // The reverse direction is a different link (cycles are allowed).
    expect(linkError(edges, ids, "api", "web")).toBeNull();
  });

  it("rejects self-links, duplicates and unknown services", () => {
    expect(linkError(edges, ids, "web", "web")).toBe("self");
    expect(linkError(edges, ids, "web", "api")).toBe("duplicate");
    expect(linkError(edges, ids, "web", "ghost")).toBe("unknown");
    expect(linkError(edges, ids, "ghost", "web")).toBe("unknown");
  });

  it("rebuilds references from the current edges, keeping untouched services as is", () => {
    const before = [service("web", ["api"]), service("api"), service("db")];
    const after = withReferences(before, [
      { id: "web->api", source: "web", target: "api" },
      { id: "api->db", source: "api", target: "db" },
    ]);
    expect(after[0]).toBe(before[0]);
    expect(after[1]!.references).toEqual(["db"]);
    expect(after[2]).toBe(before[2]);
  });
});

describe("findFreeSpot", () => {
  const card = (x: number, y: number) => ({ x, y, width: NODE_WIDTH, height: DEFAULT_NODE_HEIGHT });

  it("keeps the preferred spot when it is free", () => {
    expect(findFreeSpot([card(1000, 1000)], { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("moves to the nearest spot that overlaps no card", () => {
    const boxes = [card(0, 0), card(336, 0), card(0, 136)];
    const spot = findFreeSpot(boxes, { x: 10, y: 10 });
    const box = { ...spot, width: NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
    for (const other of boxes) expect(boxesOverlap(box, other)).toBe(false);
    expect(Math.hypot(spot.x - 10, spot.y - 10)).toBeLessThan(400);
  });

  it("puts domains in a column left of every service, level with their target", () => {
    const services = [service("web", ["api"]), service("api", ["postgres"]), service("postgres")];
    const domains = [
      { id: "db.example.com", target: "postgres" },
      { id: "spare.example.com", target: null },
      { id: "www.example.com", target: "web" },
      { id: "example.com", target: "web" },
    ];
    const positions = layoutServices(services, {}, domains);
    const serviceXs = services.map((s) => positions[s.id]!.x);
    for (const domain of domains) {
      expect(positions[domain.id]!.x).toBe(Math.min(...serviceXs) - DOMAIN_WIDTH - 96);
    }
    // Centred on the target where there's room; stacked without overlaps.
    const centre = positions.postgres!.y + (DEFAULT_NODE_HEIGHT - DEFAULT_DOMAIN_HEIGHT) / 2;
    expect(positions["db.example.com"]!.y).toBe(centre);
    const ys = domains.map((d) => positions[d.id]!.y).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]! - ys[i - 1]!).toBeGreaterThanOrEqual(DEFAULT_DOMAIN_HEIGHT + ROW_GAP);
    }
    // Unlinked domains go last.
    expect(positions["spare.example.com"]!.y).toBe(Math.max(...ys));
  });
});
