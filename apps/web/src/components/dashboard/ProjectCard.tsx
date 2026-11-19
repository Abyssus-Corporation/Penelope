import { Link } from "react-router-dom";
import * as Tooltip from "@radix-ui/react-tooltip";
import { siGithub } from "simple-icons";
import { AlertCircle, CheckCircle2, CircleDashed, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import type { Project, ServiceStatus } from "@/types/project";

// ─── Tooltip primitive ────────────────────────────────────────────────────────

function Tip({ content, children }: { content: string; children: React.ReactNode }) {
  const lines = content.split("\n");
  return (
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 max-w-[220px] animate-fade-in rounded bg-foreground px-2.5 py-1.5 shadow"
        >
          {lines.length === 1 ? (
            <span className="text-[11px] leading-snug text-background">{content}</span>
          ) : (
            <ul className="flex flex-col gap-1">
              {lines.map((line, i) => {
                const [name, ...rest] = line.split(" · ");
                return (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-background/80">{name}</span>
                    <span className="text-[10px] tabular-nums text-background/50">
                      {rest.join(" · ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// ─── Status dot ───────────────────────────────────────────────────────────────

export function StatusDot({ status }: { status: ServiceStatus }) {
  if (status === "building") {
    return (
      <CircleDashed size={12} strokeWidth={2} className="shrink-0 animate-pulse text-amber-400" />
    );
  }

  const color: Record<Exclude<ServiceStatus, "building">, string> = {
    running: "bg-success",
    failed: "bg-destructive",
    sleeping: "bg-muted-foreground/40",
  };

  return (
    <span className={cn("size-1.5 shrink-0 rounded-full", color[status as keyof typeof color])} />
  );
}

// ─── Status icon (card-level) ─────────────────────────────────────────────────

type SummaryStrings = { allRunning: string; allSleeping: string; failed: string; building: string };

function statusSummary(project: Project, summary: SummaryStrings): string {
  const failed = project.services.filter((s) => s.status === "failed");
  const building = project.services.filter((s) => s.status === "building");
  const total = project.services.length;

  if (failed.length > 0) {
    return summary.failed
      .replace("{n}", String(failed.length))
      .replace("{total}", String(total))
      .replace("{names}", failed.map((s) => s.name).join(", "));
  }
  if (building.length > 0) {
    return summary.building.replace("{names}", building.map((s) => s.name).join(", "));
  }
  if (project.services.every((s) => s.status === "sleeping")) {
    return summary.allSleeping;
  }
  return summary.allRunning.replace("{n}", String(total));
}

export function CardStatusIcon({ project }: { project: Project }) {
  const { dashboard: d } = useI18n();
  const hasFailure = project.services.some((s) => s.status === "failed");
  const hasBuilding = project.services.some((s) => s.status === "building");
  const allSleeping = project.services.every((s) => s.status === "sleeping");

  const icon = (() => {
    if (hasFailure) return <AlertCircle size={14} className="shrink-0 text-destructive" />;
    if (hasBuilding)
      return (
        <CircleDashed size={14} strokeWidth={2} className="shrink-0 animate-pulse text-amber-400" />
      );
    if (allSleeping) return <Clock size={14} className="shrink-0 text-muted-foreground/50" />;
    return <CheckCircle2 size={14} className="shrink-0 text-success" />;
  })();

  return <Tip content={statusSummary(project, d.service.summary)}>{icon}</Tip>;
}

// ─── Project card ─────────────────────────────────────────────────────────────

export function ProjectCard({ project }: { project: Project }) {
  const t = useI18n();
  const d = t.dashboard;

  const hasFailure = project.services.some((s) => s.status === "failed");

  const serviceListTooltip = project.services
    .map((s) => `${s.name} · ${d.service[s.status]}`)
    .join("\n");

  return (
    <Tooltip.Provider>
      <Link
        to={`/projects/${project.id}`}
        className={cn(
          "group flex flex-col gap-3 rounded-md border bg-card p-4 transition-all duration-150",
          "hover:border-foreground/25 hover:bg-accent",
          hasFailure ? "border-destructive/30 hover:border-destructive/50" : "border-border",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <CardStatusIcon project={project} />
          <span className="flex-1 truncate text-[13px] font-semibold text-foreground">
            {project.name}
          </span>
          <Tip content={serviceListTooltip}>
            <span className="shrink-0 cursor-default text-[11px] tabular-nums text-muted-foreground/70">
              {project.services.length} {d.projects.svc}
            </span>
          </Tip>
        </div>

        {/* Services — max 4 rows, fixed height */}
        <ul className="flex h-[88px] flex-col gap-1">
          {(project.services.length > 4 ? project.services.slice(0, 3) : project.services).map(
            (svc) => (
              <li key={svc.name} className="flex h-5 items-center gap-2">
                <StatusDot status={svc.status} />
                <span className="flex-1 truncate text-xs text-muted-foreground">{svc.name}</span>
                <span className="text-[11px] text-muted-foreground/70">
                  {d.service[svc.status]}
                </span>
              </li>
            ),
          )}
          {project.services.length > 4 && (
            <li className="flex h-5 items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/20" />
              <Tip
                content={project.services
                  .slice(3)
                  .map((s) => `${s.name} · ${d.service[s.status]}`)
                  .join("\n")}
              >
                <span className="cursor-default text-xs text-muted-foreground/70 transition-colors hover:text-muted-foreground">
                  +{project.services.length - 3} {d.projects.more}
                </span>
              </Tip>
            </li>
          )}
        </ul>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <svg
              role="img"
              viewBox="0 0 24 24"
              className="size-[11px] shrink-0 fill-muted-foreground/60"
              dangerouslySetInnerHTML={{ __html: siGithub.path }}
            />
            <span className="truncate font-mono text-[11px] text-muted-foreground/80 transition-colors group-hover:text-muted-foreground">
              {project.repo.owner}/{project.repo.name}
            </span>
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/60">
            {project.deployedAt}
          </span>
        </div>
      </Link>
    </Tooltip.Provider>
  );
}
