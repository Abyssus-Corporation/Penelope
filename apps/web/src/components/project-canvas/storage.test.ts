import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_DOMAINS,
  POSITION_LIMIT,
  STORAGE_VERSION,
  canvasKey,
  loadCanvas,
  migrateV1,
  parseStoredCanvas,
  saveCanvas,
} from "./storage";

const BASE = ["web", "api", "postgres"];
const added = {
  id: "billing",
  name: "billing",
  kind: "worker",
  source: { type: "repo", label: "acme/billing" },
};
const generated = {
  id: "web-1a2b3c.penelope.local",
  hostname: "web-1a2b3c.penelope.local",
  type: "generated",
  target: "web",
  port: 8080,
  verified: true,
};
const custom = {
  id: "app.example.com",
  hostname: "app.example.com",
  type: "custom",
  target: null,
  port: 3000,
  verified: false,
};
const EMPTY = { services: [], edges: null, positions: {}, domains: [] };
const record = (extra: Record<string, unknown>) => ({ version: STORAGE_VERSION, ...extra });

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("canvas persistence", () => {
  it("round-trips services, edges and positions per project", () => {
    const canvas = {
      services: [added as never],
      edges: [{ id: "billing->postgres", source: "billing", target: "postgres" }],
      positions: {
        web: { x: 10, y: -20.5 },
        billing: { x: 300, y: 0 },
        "app.example.com": { x: -300, y: 0 },
      },
      domains: [generated as never, custom as never],
    };
    saveCanvas("acme", canvas);
    expect(JSON.parse(localStorage.getItem(canvasKey("acme"))!).version).toBe(STORAGE_VERSION);
    expect(loadCanvas("acme", BASE)).toEqual(canvas);
    expect(loadCanvas("other", BASE)).toEqual(EMPTY);
  });

  it.each([
    ["missing", null],
    ["not JSON", "{oops"],
    ["an array", "[1,2]"],
    ["a number", "42"],
    ["null", "null"],
    ["unversioned", JSON.stringify({ services: [added] })],
    ["from a newer version", JSON.stringify({ version: STORAGE_VERSION + 1, services: [added] })],
  ])("starts fresh when the stored value is %s", (_, raw) => {
    if (raw !== null) localStorage.setItem(canvasKey("acme"), raw);
    expect(loadCanvas("acme", BASE)).toEqual(EMPTY);
  });

  it("starts fresh when storage throws (blocked or private mode)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadCanvas("acme", BASE).services).toEqual([]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    expect(() => saveCanvas("acme", EMPTY)).not.toThrow();
  });

  it("drops added services that are malformed or collide", () => {
    const { services } = parseStoredCanvas(
      record({
        services: [
          added,
          { ...added }, // duplicate name
          { ...added, id: "api", name: "api" }, // collides with an API service
          { ...added, id: "x", name: "Bad Name" },
          { ...added, id: "other", name: "mismatch" },
          { ...added, id: "k", name: "k", kind: "mainframe" },
          { ...added, id: "s", name: "s", source: { type: "repo", label: "no-slash" } },
          { ...added, id: "t", name: "t", source: { type: "ftp", label: "x" } },
          { ...added, id: "__proto__", name: "__proto__" },
          "billing",
          null,
        ],
      }),
      BASE,
    );
    expect(services).toEqual([added]);
  });

  it("keeps only links between existing services, without self-links or duplicates", () => {
    const { edges } = parseStoredCanvas(
      record({
        services: [added],
        edges: [
          { id: "ignored", source: "web", target: "api" },
          { source: "web", target: "api" },
          { source: "api", target: "api" },
          { source: "api", target: "ghost" },
          { source: "billing", target: "postgres", envVar: "DATABASE_URL" },
          { source: 1, target: "api" },
          "web->api",
        ],
      }),
      BASE,
    );
    // ids are rebuilt from source/target; unknown fields are not carried over.
    expect(edges).toEqual([
      { id: "web->api", source: "web", target: "api" },
      { id: "billing->postgres", source: "billing", target: "postgres" },
    ]);
  });

  it("an empty edge list means every link was removed, not 'use the defaults'", () => {
    expect(parseStoredCanvas(record({ edges: [] }), BASE).edges).toEqual([]);
    expect(parseStoredCanvas(record({ edges: "nope" }), BASE).edges).toBeNull();
  });

  it("keeps finite positions for known services, clamped to the canvas bounds", () => {
    const { positions } = parseStoredCanvas(
      record({
        positions: {
          web: { x: 1e9, y: -1e9 },
          api: { x: Number.NaN, y: 0 },
          postgres: { x: "1", y: 2 },
          ghost: { x: 1, y: 1 },
          __proto__: { x: 1, y: 1 },
        },
      }),
      BASE,
    );
    expect(positions).toEqual({ web: { x: POSITION_LIMIT, y: -POSITION_LIMIT } });
    expect(Object.getPrototypeOf(positions)).toBeNull();
  });

  it("migrates a v1 canvas to v2, keeping everything and adding no domains", () => {
    const v1 = {
      version: 1,
      services: [added],
      edges: [{ source: "billing", target: "postgres" }],
      positions: { billing: { x: 1, y: 2 } },
    };
    expect(migrateV1(v1)).toEqual({ ...v1, version: 2, domains: [] });
    localStorage.setItem(canvasKey("acme"), JSON.stringify(v1));
    expect(loadCanvas("acme", BASE)).toEqual({
      services: [added],
      edges: [{ id: "billing->postgres", source: "billing", target: "postgres" }],
      positions: { billing: { x: 1, y: 2 } },
      domains: [],
    });
    // Saved back as v2.
    saveCanvas("acme", loadCanvas("acme", BASE));
    expect(JSON.parse(localStorage.getItem(canvasKey("acme"))!).version).toBe(2);
  });

  it("drops domains that are malformed, collide or point at unknown services", () => {
    const { domains } = parseStoredCanvas(
      record({
        services: [added],
        domains: [
          generated,
          custom,
          { ...custom, target: "billing", id: "b.example.com", hostname: "b.example.com" },
          { ...custom }, // duplicate
          { ...custom, id: "x.example.com" }, // id ≠ hostname
          { ...custom, id: "UP.example.com", hostname: "UP.example.com" }, // not normalized
          { ...custom, id: "café.fr", hostname: "café.fr" }, // not punycode
          { ...custom, id: "a.penelope.local", hostname: "a.penelope.local" }, // reserved
          { ...custom, id: "noport.example.com", hostname: "noport.example.com", port: 0 },
          { ...custom, id: "big.example.com", hostname: "big.example.com", port: 70000 },
          { ...custom, id: "f.example.com", hostname: "f.example.com", port: 80.5 },
          { ...custom, id: "g.example.com", hostname: "g.example.com", target: "ghost" },
          { ...custom, id: "h.example.com", hostname: "h.example.com", verified: "yes" },
          { ...custom, id: "i.example.com", hostname: "i.example.com", type: "other" },
          {
            ...generated,
            verified: false,
            id: "w-1.penelope.local",
            hostname: "w-1.penelope.local",
          },
          { ...generated, id: "-bad.penelope.local", hostname: "-bad.penelope.local" },
          { ...generated, id: "web.other.local", hostname: "web.other.local" },
          { ...custom, id: "__proto__", hostname: "__proto__" },
          "app.example.com",
          null,
        ],
        positions: { "app.example.com": { x: 5, y: 5 }, "ghost.example.com": { x: 1, y: 1 } },
      }),
      BASE,
    );
    expect(domains).toEqual([
      generated,
      custom,
      { ...custom, target: "billing", id: "b.example.com", hostname: "b.example.com" },
    ]);
    expect(
      parseStoredCanvas(record({ domains, positions: { "app.example.com": { x: 5, y: 5 } } }), BASE)
        .positions,
    ).toEqual({ "app.example.com": { x: 5, y: 5 } });
  });

  it("treats a missing or non-array domain list as none, and caps its size", () => {
    expect(parseStoredCanvas(record({}), BASE).domains).toEqual([]);
    expect(parseStoredCanvas(record({ domains: "x" }), BASE).domains).toEqual([]);
    const many = Array.from({ length: MAX_DOMAINS + 5 }, (_, i) => ({
      ...custom,
      id: `d${i}.example.com`,
      hostname: `d${i}.example.com`,
    }));
    expect(parseStoredCanvas(record({ domains: many }), BASE).domains).toHaveLength(MAX_DOMAINS);
  });
});
