import { describe, expect, it } from "vitest";
import { en } from "@/i18n/locales/en";
import type { Project, ServiceStatus } from "@/types/project";
import { projectInitials, statusSummary } from "./project-summary";

function project(...statuses: ServiceStatus[]): Project {
  return {
    id: "p",
    name: "p",
    services: statuses.map((status, i) => ({ name: `svc-${i}`, status })),
    deployedAt: "2026-11-21T12:00:00Z",
  };
}

const summary = (p: Project) => statusSummary(p, en.dashboard.service.summary, "en");

describe("projectInitials", () => {
  it("uses the first letter of the first two words", () => {
    expect(projectInitials("acme-production")).toBe("AP");
    expect(projectInitials("staging")).toBe("S");
    expect(projectInitials("preview/pr-42")).toBe("PP");
  });

  it("keeps non-ASCII letters whole", () => {
    expect(projectInitials("Đặng Thị Lan")).toBe("ĐT");
    expect(projectInitials("über-api")).toBe("ÜA");
  });

  it("returns nothing when the name has no letters or digits", () => {
    expect(projectInitials("🚀")).toBe("");
    expect(projectInitials("---")).toBe("");
  });
});

describe("statusSummary", () => {
  it("does not call an empty project sleeping", () => {
    expect(summary(project())).toBe("No services yet");
  });

  it("pluralizes running and sleeping counts", () => {
    expect(summary(project("running"))).toBe("1 service running");
    expect(summary(project("running", "running", "running"))).toBe("All 3 services running");
    expect(summary(project("sleeping"))).toBe("1 service sleeping");
    expect(summary(project("sleeping", "sleeping"))).toBe("All 2 services sleeping");
  });

  it("puts failures before builds", () => {
    expect(summary(project("failed", "building", "running"))).toBe("1 of 3 failed: svc-0");
    expect(summary(project("building", "running"))).toBe("Building: svc-0");
  });
});
