import {
  AppWindow,
  Clock,
  Container,
  Cpu,
  Database,
  FileCode,
  GitBranch,
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
  // Not Globe: that is the domain icon.
  web: AppWindow,
  service: Server,
  worker: Cpu,
  cron: Clock,
  database: Database,
  cache: MemoryStick,
};

/** Muted per-kind accent: border + background + icon color. */
const KIND_COLORS: Record<ServiceKind, string> = {
  web: "border-blue-500/25 bg-blue-500/10 text-blue-400 dark:text-blue-400",
  service: "border-violet-500/25 bg-violet-500/10 text-violet-400 dark:text-violet-400",
  worker: "border-amber-500/25 bg-amber-500/10 text-amber-400 dark:text-amber-400",
  cron: "border-purple-500/25 bg-purple-500/10 text-purple-400 dark:text-purple-400",
  database: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400 dark:text-emerald-400",
  cache: "border-rose-500/25 bg-rose-500/10 text-rose-400 dark:text-rose-400",
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
        "flex size-8 shrink-0 items-center justify-center rounded-md border",
        KIND_COLORS[kind],
        className,
      )}
    >
      <Icon size={15} strokeWidth={1.5} />
    </span>
  );
}

/** Source on one line; long image names and paths wrap rather than clip. */
export function ServiceSourceLine({
  service,
  clamp = false,
}: {
  service: CanvasService;
  /** Canvas cards cap the source at two lines (full text in `title` and in the DOM). */
  clamp?: boolean;
}) {
  const c = useI18n().project.canvas;
  const Icon = service.source ? SOURCE_ICONS[service.source.type] : null;
  return (
    <span className="flex min-w-0 items-start gap-1.5 text-xs text-muted-foreground">
      {Icon && <Icon size={12} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />}
      {service.source ? (
        <span
          title={clamp ? service.source.label : undefined}
          className={cn("min-w-0 [overflow-wrap:anywhere]", clamp && "line-clamp-2")}
        >
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
  if (service.status === null) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground">
        <span className="flex size-2.5 items-center justify-center">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full border border-muted-foreground/50"
          />
        </span>
        {t.project.canvas.notDeployed}
      </span>
    );
  }
  const colorClass =
    service.status === "failed"
      ? "text-destructive"
      : service.status === "sleeping"
        ? "text-muted-foreground"
        : "text-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium",
        colorClass,
      )}
    >
      <span className="flex size-2.5 items-center justify-center">
        <StatusDot status={service.status} />
      </span>
      {t.dashboard.service[service.status]}
    </span>
  );
}

export function LastDeploy({ service, className }: { service: CanvasService; className?: string }) {
  const t = useI18n();
  // A service added here has no status either; "Not deployed" already says it.
  if (service.status === null) return null;
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
