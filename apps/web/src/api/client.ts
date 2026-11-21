import type { components } from "@penelope/api-types";

export type ApiProject = components["schemas"]["Project"];
export type ApiService = components["schemas"]["Service"];

/**
 * The calls the web app makes to the Penelope API. Pages depend on this
 * interface only, so the mock can be swapped for a fetch client in one place.
 */
export interface ApiClient {
  projects: {
    /** Resolves to null when no project has this id (a 404 from the API). */
    get(id: string): Promise<ApiProject | null>;
  };
  auth: {
    /**
     * Asks the API to email a reset link. Resolves the same way whether or not
     * an account exists for the address; rejects only on transport failure.
     */
    requestPasswordReset(email: string): Promise<void>;
  };
}
