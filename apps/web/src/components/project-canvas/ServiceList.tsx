import { ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { DnsStatusBadge, DomainIcon, HttpsBadge, Hostname } from "./domain-parts";
import { fill } from "./text";
import { KindIcon, LastDeploy, ServiceSourceLine, ServiceStatusLabel } from "./service-parts";
import type { CanvasDomain, CanvasService } from "./types";

const ROW =
  "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4";

/**
 * The canvas as a list: same services and domains, same open action (links are
 * edited in the sheet), plain reading order.
 */
export function ServiceList({
  services,
  domains = [],
  onOpen,
}: {
  services: CanvasService[];
  domains?: readonly CanvasDomain[];
  onOpen: (id: string) => void;
}) {
  const c = useI18n().project.canvas;
  const d = useI18n().project.domain;
  return (
    <div className="space-y-6">
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
              className={ROW}
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
      {domains.length > 0 && (
        <section aria-labelledby="domain-list-heading">
          <h2 id="domain-list-heading" className="mb-2 text-sm font-medium text-foreground">
            {d.listLabel}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {domains.map((domain) => (
              <li key={domain.id}>
                <button
                  type="button"
                  data-domain-id={domain.id}
                  aria-haspopup="dialog"
                  onClick={() => onOpen(domain.id)}
                  className={ROW}
                >
                  <DomainIcon />
                  <span className="min-w-0 flex-1">
                    {/* 13px mono in a 320px row: ~24 characters per line. */}
                    <Hostname
                      hostname={domain.hostname}
                      maxLabel={24}
                      className="font-mono text-[13px] font-medium leading-5 text-foreground"
                    />
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {domain.type === "generated" ? d.generated : d.custom}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <DnsStatusBadge domain={domain} />
                      <HttpsBadge domain={domain} />
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      {domain.target ? fill(d.routesTo, { service: domain.target }) : d.unlinked}
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
        </section>
      )}
    </div>
  );
}
