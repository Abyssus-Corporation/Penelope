import { useEffect, useState } from "react";
import type { ApiProject } from "@/api";
import { toCanvasServices } from "./graph";
import type { CanvasService, ServiceDetails } from "./types";

// Until the API returns kind/source/references per service, dev and tests
// enrich projects from fixtures. In production `import.meta.env.DEV` is false,
// the import is dropped, and services render from the API's name + status only.
async function loadDetails(projectId: string): Promise<Record<string, ServiceDetails> | undefined> {
  if (!import.meta.env.DEV) return undefined;
  const { SERVICE_DETAILS } = await import("./fixtures");
  return Object.prototype.hasOwnProperty.call(SERVICE_DETAILS, projectId)
    ? SERVICE_DETAILS[projectId]
    : undefined;
}

/** Services for the canvas and list, or null while details load. */
export function useCanvasServices(project: ApiProject): CanvasService[] | null {
  const [services, setServices] = useState<CanvasService[] | null>(null);

  useEffect(() => {
    let active = true;
    setServices(null);
    loadDetails(project.id).then(
      (details) => active && setServices(toCanvasServices(project, details)),
      () => active && setServices(toCanvasServices(project, undefined)),
    );
    return () => {
      active = false;
    };
  }, [project]);

  return services;
}
