import { describe, expect, it } from "vitest";
import type { ApiProject } from "@/api";
import { CANVAS_FIXTURE_PROJECTS, SERVICE_DETAILS } from "./fixtures";
import { NODE_WIDTH, layoutServices, toCanvasServices, toEdges } from "./graph";

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
});
