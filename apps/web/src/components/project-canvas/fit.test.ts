import { describe, expect, it } from "vitest";
import { NODE_WIDTH } from "./graph";
import { NARROW_MIN_ZOOM, NARROW_PADDING, WIDE_MIN_ZOOM, WIDE_PADDING, chooseFit } from "./fit";

const node = (id: string, x: number, y: number) => ({ id, position: { x, y } });
const LAPTOP = { width: 1040, height: 700 };

describe("chooseFit", () => {
  it("narrow: frames the first column at a readable zoom, right of the zoom controls", () => {
    const size = { width: 320, height: 500 };
    const { mode, viewport } = chooseFit(
      [node("db", 672, 0), node("web-2", 0, 136), node("api", 336, 0), node("web-1", 0, 0)],
      size,
      true,
    );
    expect(mode).toBe("first");
    expect(viewport.zoom).toBeGreaterThanOrEqual(NARROW_MIN_ZOOM);
    expect(viewport.zoom).toBeLessThanOrEqual(1);
    // web-1 (the first card) starts right of the controls gutter; nothing is left of it.
    expect(viewport.x).toBe(NARROW_PADDING.left);
    expect(viewport.y).toBe(NARROW_PADDING.top);
    expect(viewport.x).toBeGreaterThanOrEqual(56);
    expect(viewport.x + NODE_WIDTH * viewport.zoom).toBeLessThanOrEqual(size.width);
  });

  it("wide: a graph that fits at a readable zoom is fitted whole and centred", () => {
    const { mode, viewport } = chooseFit(
      [node("web", 0, 0), node("api", 336, 0), node("db", 672, 0)],
      LAPTOP,
      false,
    );
    expect(mode).toBe("all");
    expect(viewport.zoom).toBe(1);
    // Never under the controls column on the left.
    expect(viewport.x).toBeGreaterThanOrEqual(WIDE_PADDING.left);
  });

  it("wide: 60+ services show the first column at zoom ≥ 0.5 instead of shrinking to 0.2", () => {
    const nodes = Array.from({ length: 64 }, (_, i) =>
      node(`s-${i}`, Math.floor(i / 6) * 336, (i % 6) * 136),
    );
    const { mode, viewport } = chooseFit(nodes, LAPTOP, false);
    expect(mode).toBe("first");
    expect(viewport.zoom).toBeGreaterThanOrEqual(WIDE_MIN_ZOOM);
    expect(viewport.x).toBe(WIDE_PADDING.left);
  });
});
