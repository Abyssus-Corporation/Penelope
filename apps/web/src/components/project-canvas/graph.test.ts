import { describe, expect, it } from "vitest";
import type { ApiProject } from "@/api";
import { CANVAS_FIXTURE_PROJECTS, SERVICE_DETAILS } from "./fixtures";
import {
  DEFAULT_NODE_HEIGHT,
  NODE_WIDTH,
  ROW_GAP,
  layoutServices,
  toCanvasServices,
  toEdges,
} from "./graph";

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
});
