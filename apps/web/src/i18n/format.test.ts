import { describe, expect, it } from "vitest";
import { formatNumber, formatRelativeTime, plural } from "./format";

const forms = { one: "{n} service", other: "{n} services" };

describe("plural", () => {
  it("picks the singular form only for one", () => {
    expect(plural("en", forms, 0)).toBe("0 services");
    expect(plural("en", forms, 1)).toBe("1 service");
    expect(plural("en", forms, 2)).toBe("2 services");
  });

  it("formats the count with thousands separators", () => {
    expect(plural("en", forms, 1284)).toBe("1,284 services");
    expect(formatNumber("en", 1000)).toBe("1,000");
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-11-21T12:00:00Z");

  it("formats past timestamps relative to now, with the absolute date", () => {
    const result = formatRelativeTime("en", "2026-11-21T11:56:00Z", "just now", now);
    expect(result?.relative).toBe("4m ago");
    expect(result?.absolute).toMatch(/Nov 21, 2026/);
    expect(formatRelativeTime("en", "2026-11-19T12:00:00Z", "just now", now)?.relative).toBe(
      "2d ago",
    );
  });

  it("says just now under a minute", () => {
    expect(formatRelativeTime("en", "2026-11-21T11:59:30Z", "just now", now)?.relative).toBe(
      "just now",
    );
  });

  it("returns null for values that are not dates", () => {
    expect(formatRelativeTime("en", "4m ago", "just now", now)).toBeNull();
    expect(formatRelativeTime("en", "", "just now", now)).toBeNull();
  });
});
