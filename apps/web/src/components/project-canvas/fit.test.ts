import { describe, expect, it } from "vitest";
import { NARROW_MIN_ZOOM, WIDE_FIT, narrowFitOptions } from "./fit";

const node = (id: string, x: number, y: number) => ({ id, position: { x, y } });

describe("narrow fit", () => {
  it("centres the first column at a readable zoom instead of fitting everything", () => {
    const options = narrowFitOptions([
      node("db", 672, 0),
      node("web-2", 0, 136),
      node("api", 336, 0),
      node("web-1", 0, 0),
      node("web-3", 10, 272),
    ]);
    expect(options.nodes).toEqual([{ id: "web-1" }, { id: "web-2" }]);
    expect(options.minZoom).toBe(NARROW_MIN_ZOOM);
    expect(NARROW_MIN_ZOOM).toBeGreaterThanOrEqual(0.75);
    expect(options.maxZoom).toBe(1);
  });

  it("wide screens still fit every service", () => {
    expect(WIDE_FIT.nodes).toBeUndefined();
    expect(WIDE_FIT.minZoom).toBeUndefined();
  });
});
