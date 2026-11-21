import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { canvasKey } from "./storage";
import type { CanvasDomain, CanvasService } from "./types";
import { useProjectGraph } from "./use-project-graph";

const service = (id: string, references: string[] = []): CanvasService => ({
  id,
  name: id,
  status: "running",
  kind: "service",
  source: null,
  deployedAt: null,
  references,
});
const BASE = [service("web", ["api"]), service("api", ["postgres"]), service("postgres")];
const domain: CanvasDomain = {
  id: "shop.example.com",
  hostname: "shop.example.com",
  type: "custom",
  target: null,
  port: 8080,
  verified: false,
};

afterEach(() => localStorage.clear());

async function setup() {
  const hook = renderHook(() => useProjectGraph("p", BASE));
  await waitFor(() => expect(hook.result.current).not.toBeNull());
  return hook;
}

describe("useProjectGraph with domains", () => {
  it("links a domain to one service, replaces on re-link, and unlinks like an edge", async () => {
    const { result } = await setup();
    act(() => result.current!.addDomain(domain, { x: -300, y: 0 }));
    expect(result.current!.positions[domain.id]).toEqual({ x: -300, y: 0 });

    let error: unknown;
    act(() => void (error = result.current!.connect(domain.id, "web")));
    expect(error).toBeNull();
    expect(result.current!.edges).toContainEqual({
      id: "shop.example.com->web",
      source: "shop.example.com",
      target: "web",
    });
    // Domain edges don't count as service references.
    expect(result.current!.services.find((s) => s.id === "web")!.references).toEqual(["api"]);

    act(() => void (error = result.current!.connect(domain.id, "api")));
    expect(error).toBeNull();
    expect(result.current!.domains[0]!.target).toBe("api");
    expect(result.current!.edges.filter((e) => e.source === domain.id)).toHaveLength(1);

    act(() => void (error = result.current!.connect("web", domain.id)));
    expect(error).toBe("toDomain");

    act(() => result.current!.disconnect("shop.example.com->api"));
    expect(result.current!.domains[0]!.target).toBeNull();
    // Service links are untouched.
    expect(result.current!.edges.map((e) => e.id)).toEqual(["web->api", "api->postgres"]);
    expect(JSON.parse(localStorage.getItem(canvasKey("p"))!).domains[0].target).toBeNull();
  });

  it("updates port and verification", async () => {
    const { result } = await setup();
    act(() => result.current!.addDomain(domain));
    act(() => result.current!.updateDomain(domain.id, { port: 3000, verified: true }));
    expect(result.current!.domains[0]).toMatchObject({ port: 3000, verified: true });
  });
});
