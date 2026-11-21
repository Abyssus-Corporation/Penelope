import type { ApiClient } from "./client";
import { mockApi } from "./mock";

export type { ApiClient, ApiProject, ApiService } from "./client";

// shortcut: mock data until GET /projects/{id} and a password-reset endpoint exist; swap in a fetch client here.
export const api: ApiClient = mockApi;
