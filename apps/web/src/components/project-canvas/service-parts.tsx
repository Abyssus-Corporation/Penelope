import {
  Clock,
  Container,
  Cpu,
  Database,
  FileCode,
  GitBranch,
  Globe,
  MemoryStick,
  Server,
  type LucideIcon,
} from "lucide-react";
import { StatusDot } from "@/components/dashboard/ProjectCard";
import { useI18n } from "@/i18n";
import { formatRelativeTime } from "@/i18n/format";
import { cn } from "@/lib/utils";
import type { CanvasService, ServiceKind, ServiceSourceType } from "./types";

const KIND_ICONS: Record<ServiceKind, LucideIcon> = {
  web: Globe,
  service: Server,
  worker: Cpu,
  cron: Clock,
  database: Database,
  cache: MemoryStick,
};

const SOURCE_ICONS: Record<ServiceSourceType, LucideIcon> = {
  repo: GitBranch,
  image: Container,
  dockerfile: FileCode,
};

export function KindIcon({ kind, className }: { kind: ServiceKind; className?: string }) {
  const Icon = KIND_ICONS[kind];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground",
        className,
      )}
    >
      <Icon size={15} strokeWidth={1.5} />
    </span>
  );
}

/** Source on one line; long image names and paths wrap rather than clip. */
export function ServiceSourceLine({ service }: { service: CanvasService }) {
  const c = useI18n().project.canvas;
  const Icon = service.source ? SOURCE_ICONS[service.source.type] : null;
  return (
    <span className="flex min-w-0 items-start gap-1.5 text-xs text-muted-foreground">
      {Icon && <Icon size={12} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />}
      {service.source ? (
        <span className="min-w-0 [overflow-wrap:anywhere]">
          <span className="sr-only">{c.sources[service.source.type]}: </span>
          {service.source.label}
        </span>
      ) : (
        <span>{c.noSource}</span>
      )}
    </span>
  );
}

export function ServiceStatusLabel({ service }: { service: CanvasService }) {
  const t = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-foreground">
      <span className="flex size-2.5 items-center justify-center">
        <StatusDot status={service.status} />
      </span>
      {t.dashboard.service[service.status]}
    </span>
  );
}

export function LastDeploy({ service, className }: { service: CanvasService; className?: string }) {
  const t = useI18n();
  const deployed = service.deployedAt
    ? formatRelativeTime(t.locale, service.deployedAt, t.dashboard.justNow)
    : null;
  if (!deployed) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {t.project.canvas.noDeploy}
      </span>
    );
  }
  return (
    <time
      dateTime={service.deployedAt!}
      title={deployed.absolute}
      className={cn("whitespace-nowrap text-xs tabular-nums text-muted-foreground", className)}
    >
      {t.project.canvas.deployed.replace("{time}", deployed.relative)}
    </time>
  );
}
