import { ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { KindIcon, LastDeploy, ServiceSourceLine, ServiceStatusLabel } from "./service-parts";
import type { CanvasService } from "./types";

/** The canvas as a list: same services, same open action, plain reading order. */
export function ServiceList({
  services,
  onOpen,
}: {
  services: CanvasService[];
  onOpen: (serviceId: string) => void;
}) {
  const c = useI18n().project.canvas;
  return (
    <ul
      aria-label={c.listLabel}
      className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
    >
      {services.map((service) => (
        <li key={service.id}>
          <button
            type="button"
            data-service-id={service.id}
            aria-haspopup="dialog"
            onClick={() => onOpen(service.id)}
            className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4"
          >
            <KindIcon kind={service.kind} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium leading-5 text-foreground [overflow-wrap:anywhere]">
                {service.name}
              </span>
              <span className="mt-0.5 block">
                <ServiceSourceLine service={service} />
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <ServiceStatusLabel service={service} />
                <LastDeploy service={service} />
              </span>
              <span className="mt-1 block text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {service.references.length
                  ? `${c.references} ${service.references.join(", ")}`
                  : c.referencesNone}
              </span>
            </span>
            <ChevronRight
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
              className="mt-2 shrink-0 text-muted-foreground"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
