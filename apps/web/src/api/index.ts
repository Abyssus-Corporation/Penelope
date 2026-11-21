import type { ApiClient } from "./client";
export type { ApiClient, ApiProject, ApiService } from "./client";

/** No API is wired into this build (production until a fetch client lands here). */
export class ApiUnavailableError extends Error {
  constructor() {
    super("API unavailable");
    this.name = "ApiUnavailableError";
  }
}

// shortcut: mock data until GET /projects/{id} and a password-reset endpoint exist; swap in a fetch client here.
// Dev and tests only: `import.meta.env.DEV` is statically false in production builds, so this
// dynamic import and the mock fixtures behind it are dropped from dist entirely.
const mock: Promise<ApiClient> | null = import.meta.env.DEV
  ? import("./mock").then((module) => module.mockApi)
  : null;

function call<T>(run: (client: ApiClient) => Promise<T>): Promise<T> {
  return mock ? mock.then(run) : Promise.reject(new ApiUnavailableError());
}

export const api: ApiClient = {
  projects: { get: (id) => call((client) => client.projects.get(id)) },
  auth: {
    requestPasswordReset: (email) => call((client) => client.auth.requestPasswordReset(email)),
  },
};
