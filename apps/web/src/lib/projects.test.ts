import { describe, expect, it } from "vitest";
import {
  PROJECT_NAME_MAX_LENGTH,
  createProject,
  uniqueProjectId,
  validateProjectName,
} from "./projects";

describe("validateProjectName", () => {
  it("requires a non-blank name", () => {
    expect(validateProjectName("   ", [])).toBe("required");
  });

  it("rejects names over the max length", () => {
    expect(validateProjectName("a".repeat(PROJECT_NAME_MAX_LENGTH + 1), [])).toBe("tooLong");
    expect(validateProjectName("a".repeat(PROJECT_NAME_MAX_LENGTH), [])).toBeNull();
  });

  it("rejects invalid characters and a leading symbol", () => {
    expect(validateProjectName("my project", [])).toBe("invalid");
    expect(validateProjectName("-api", [])).toBe("invalid");
  });

  it("detects taken names case-insensitively after trimming", () => {
    expect(validateProjectName("  Penelope ", ["penelope"])).toBe("taken");
  });

  it("accepts a valid unique name", () => {
    expect(validateProjectName("my-app_1.0", ["other"])).toBeNull();
  });
});

describe("uniqueProjectId", () => {
  it("slugifies the name", () => {
    expect(uniqueProjectId("My Cool App", [])).toBe("my-cool-app");
  });

  it("falls back to 'project' when nothing slug-safe remains", () => {
    expect(uniqueProjectId("___", [])).toBe("project");
  });

  it("appends a numeric suffix until the id is free", () => {
    expect(uniqueProjectId("api", ["api", "api-2"])).toBe("api-3");
  });
});

describe("createProject", () => {
  it("trims the name and starts with no services", () => {
    const project = createProject({
      name: "  web ",
      deployedAt: "2026-01-01T00:00:00Z",
      existingIds: ["web"],
    });
    expect(project).toEqual({
      id: "web-2",
      name: "web",
      services: [],
      deployedAt: "2026-01-01T00:00:00Z",
    });
  });
});
