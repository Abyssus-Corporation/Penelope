import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPositions, positionsKey, savePositions } from "./positions";

const IDS = ["web", "api", "postgres"];

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("canvas position persistence", () => {
  it("round-trips positions per project", () => {
    savePositions("acme", { web: { x: 10, y: -20.5 }, api: { x: 300, y: 0 } });
    expect(loadPositions("acme", IDS)).toEqual({ web: { x: 10, y: -20.5 }, api: { x: 300, y: 0 } });
    expect(loadPositions("other", IDS)).toEqual({});
  });

  it.each([
    ["missing", null],
    ["not JSON", "{oops"],
    ["an array", "[1,2]"],
    ["a number", "42"],
    ["null", "null"],
    ["a string", '"web"'],
  ])("ignores a stored value that is %s", (_, raw) => {
    if (raw !== null) localStorage.setItem(positionsKey("acme"), raw);
    expect(loadPositions("acme", IDS)).toEqual({});
  });

  it("keeps only finite x/y pairs for services that exist", () => {
    // Hand-written: JSON can carry 1e999 (Infinity) and an own "__proto__" key.
    localStorage.setItem(
      positionsKey("acme"),
      '{"web":{"x":1,"y":2},"api":{"x":"1","y":2},"postgres":{"x":1e999,"y":0},' +
        '"removed":{"x":5,"y":5},"__proto__":{"x":1,"y":1}}',
    );
    const positions = loadPositions("acme", [...IDS, "__proto__"]);
    expect(Object.keys(positions)).toEqual(["web", "__proto__"]);
    expect(positions.web).toEqual({ x: 1, y: 2 });
    expect(Object.getPrototypeOf(positions)).toBeNull();
  });

  it("survives blocked storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(loadPositions("acme", IDS)).toEqual({});
    expect(() => savePositions("acme", { web: { x: 0, y: 0 } })).not.toThrow();
  });
});
