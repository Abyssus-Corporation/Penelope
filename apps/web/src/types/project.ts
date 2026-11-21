export type ServiceStatus = "running" | "building" | "failed" | "sleeping";

export interface Service {
  name: string;
  status: ServiceStatus;
}

export type GitProvider = "github" | "gitlab" | "bitbucket";

export interface ProjectRepo {
  provider: GitProvider;
  owner: string;
  name: string;
  /** Unknown until the first deploy, e.g. right after a project is created. */
  lastCommit?: {
    id: string;
    message: string;
  };
}

export interface Project {
  id: string;
  name: string;
  services: Service[];
  deployedAt: string;
  repo?: ProjectRepo;
}
