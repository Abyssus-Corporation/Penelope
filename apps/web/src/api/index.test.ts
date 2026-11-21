import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock("./mock");
});

describe("api mock gating", () => {
  it("never loads the mock module when DEV is false (production builds)", async () => {
    vi.stubEnv("DEV", false);
    const loaded = vi.fn();
    vi.doMock("./mock", () => {
      loaded();
      return { mockApi: {} };
    });
    const { api, ApiUnavailableError } = await import("./index");

    await expect(api.projects.get("acme-production")).rejects.toBeInstanceOf(ApiUnavailableError);
    await expect(api.auth.requestPasswordReset("a@example.com")).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );
    expect(loaded).not.toHaveBeenCalled();
  });

  it("serves fixtures in dev and tests", async () => {
    vi.stubEnv("DEV", true);
    const { api } = await import("./index");
    const project = await api.projects.get("fleet");
    expect(project?.services.length).toBeGreaterThanOrEqual(30);
  });
});
