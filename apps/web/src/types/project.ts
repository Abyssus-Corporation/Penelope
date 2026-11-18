export type ServiceStatus = "running" | "building" | "failed" | "sleeping";

export interface Service {
  name: string;
  status: ServiceStatus;
}

export interface Project {
  id: string;
  name: string;
  services: Service[];
  deployedAt: string;
  ref: string;
}
