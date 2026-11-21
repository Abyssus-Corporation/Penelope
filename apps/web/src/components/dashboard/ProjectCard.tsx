import { useId } from "react";
import { Link } from "react-router-dom";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AlertCircle, Box, CheckCircle2, CircleDashed, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { formatRelativeTime, plural } from "@/i18n/format";
import { projectInitials, statusSummary } from "./project-summary";
import type { Project, ServiceStatus } from "@/types/project";

// ─── Status dot ───────────────────────────────────────────────────────────────

export function StatusDot({ status }: { status: ServiceStatus }) {
  if (status === "building") {
    return (
      <CircleDashed
        size={10}
        strokeWidth={2}
        aria-hidden="true"
        className="shrink-0 animate-pulse text-amber-400"
      />
    );
  }

  const color: Record<Exclude<ServiceStatus, "building">, string> = {
    running: "bg-success",
    failed: "bg-destructive",
    sleeping: "bg-muted-foreground/40",
  };

  return (
    <span
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full", color[status as keyof typeof color])}
    />
  );
}

// ─── Project avatar ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-800 dark:text-blue-400",
  "bg-violet-500/15 text-violet-800 dark:text-violet-400",
  "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400",
  "bg-orange-500/15 text-orange-800 dark:text-orange-400",
  "bg-rose-500/15 text-rose-800 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-800 dark:text-cyan-400",
  "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  "bg-pink-500/15 text-pink-800 dark:text-pink-400",
];

function projectColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function ProjectAvatar({ name }: { name: string }) {
  const initials = projectInitials(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md text-[13px] font-semibold",
        projectColor(name),
      )}
    >
      {initials || <Box size={15} strokeWidth={1.5} />}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function CardStatusBadge({ project }: { project: Project }) {
  const { dashboard: d, locale } = useI18n();
  const isEmpty = project.services.length === 0;
  const hasFailure = project.services.some((s) => s.status === "failed");
  const hasBuilding = project.services.some((s) => s.status === "building");
  const allSleeping = project.services.every((s) => s.status === "sleeping");
  const summary = statusSummary(project, d.service.summary, locale);

  const badge = (() => {
    if (isEmpty)
      return (
        <span className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Box size={11} aria-hidden="true" />
          {d.service.badge.empty}
        </span>
      );
    if (hasFailure)
      return (
        <span className="flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
          <AlertCircle size={11} aria-hidden="true" />
          {d.service.badge.error}
        </span>
      );
    if (hasBuilding)
      return (
        <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-400">
          <CircleDashed size={11} strokeWidth={2} aria-hidden="true" className="animate-pulse" />
          {d.service.badge.building}
        </span>
      );
    if (allSleeping)
      return (
        <span className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Clock size={11} aria-hidden="true" />
          {d.service.badge.idle}
        </span>
      );
    return (
      <span className="flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
        <CheckCircle2 size={11} aria-hidden="true" />
        {d.service.badge.ready}
      </span>
    );
  })();

  return (
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger asChild>
        <span className="shrink-0">{badge}</span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 animate-fade-in rounded bg-foreground px-2.5 py-1.5 text-[11px] text-background shadow"
        >
          {summary}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

export function ProjectCard({ project }: { project: Project }) {
  const { dashboard: d, locale } = useI18n();
  const hasFailure = project.services.some((s) => s.status === "failed");
  const deployed = formatRelativeTime(locale, project.deployedAt, d.justNow);
  const summaryId = useId();

  return (
    // The accessible name is the visible text (name, badge, count, time) so it matches
    // what sighted voice-control users see; the status details go in the description.
    <Link
      to={`/projects/${project.id}`}
      aria-describedby={summaryId}
      className={cn(
        "group flex flex-col rounded-md border bg-card transition-all duration-150",
        // Skip layout and paint for off-screen cards; large project lists stay responsive.
        "content-auto",
        "hover:border-foreground/20 hover:shadow-sm",
        hasFailure ? "border-destructive/25 hover:border-destructive/40" : "border-border",
      )}
    >
      <span id={summaryId} hidden>
        {statusSummary(project, d.service.summary, locale)}
      </span>

      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <ProjectAvatar name={project.name} />
        {/* Never clipped: lookalike names often differ only at the end, and the API caps names at 48 characters. */}
        <span className="flex min-h-9 min-w-0 flex-1 items-center">
          <span className="break-words text-[14px] font-semibold text-foreground">
            {project.name}
          </span>
        </span>
        <span className="flex h-9 shrink-0 items-center">
          <CardStatusBadge project={project} />
        </span>
      </div>

      {/* Footer */}
      <div className="mx-4 border-t border-border/60" />
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[11px] text-muted-foreground">
          {plural(locale, d.projects.services, project.services.length)}
        </span>
        {deployed && (
          <time
            dateTime={project.deployedAt}
            title={deployed.absolute}
            className="text-[11px] tabular-nums text-muted-foreground"
          >
            {deployed.relative}
          </time>
        )}
      </div>
    </Link>
  );
}
