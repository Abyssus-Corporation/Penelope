import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, GitBranch } from "lucide-react";
import { api, ApiUnavailableError, type ApiProject } from "@/api";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { formatRelativeTime, plural } from "@/i18n/format";

// The canvas/list view (graph, storage, domains, Radix menus) is its own chunk, so the
// entry bundle stays under 500 kB. Its download starts with the project request, so the
// two load in parallel rather than one after the other.
const loadCanvasView = () => import("@/components/project-canvas/ProjectCanvasView");
const ProjectCanvasView = lazy(() =>
  loadCanvasView().then((module) => ({ default: module.ProjectCanvasView })),
);

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "unavailable" }
  | { status: "not-found" }
  | { status: "ready"; project: ApiProject };

const H1 = "break-words font-display text-[2rem] font-light leading-tight tracking-[-0.03em]";
function useProject(id: string) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void loadCanvasView();
    api.projects.get(id).then(
      (project) =>
        active && setState(project ? { status: "ready", project } : { status: "not-found" }),
      (error: unknown) =>
        active &&
        setState({ status: error instanceof ApiUnavailableError ? "unavailable" : "error" }),
    );
    return () => {
      active = false;
    };
  }, [id, attempt]);

  return [state, useCallback(() => setAttempt((n) => n + 1), [])] as const;
}

export function ProjectPage() {
  const { id = "" } = useParams();
  const t = useI18n();
  const p = t.project;
  const [state, retry] = useProject(id);
  const message = state.status !== "loading" && state.status !== "ready";

  const crumb =
    state.status === "ready"
      ? state.project.name
      : state.status === "not-found"
        ? p.notFoundTitle
        : state.status === "error"
          ? p.errorTitle
          : state.status === "unavailable"
            ? p.unavailableTitle
            : p.loading;

  return (
    <AppShell
      header={
        <nav aria-label={p.breadcrumb} className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1.5 text-[14px]">
            <li className="shrink-0">
              <Link
                to="/dashboard"
                className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {p.back}
              </Link>
            </li>
            <li aria-hidden="true" className="shrink-0 text-muted-foreground">
              <ChevronRight size={14} strokeWidth={1.5} />
            </li>
            {/* Truncated here only; the h1 below always shows the full name. */}
            <li aria-current="page" className="min-w-0 truncate font-semibold text-foreground">
              {crumb}
            </li>
          </ol>
        </nav>
      }
    >
      {state.status === "ready" ? (
        // Fill the content area below AppShell's h-14 header; the canvas takes what's left.
        <div className="flex min-h-[calc(100dvh-theme(spacing.14))] flex-col">
          <Suspense
            fallback={
              <div className="px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
                <ProjectHeader project={state.project} />
              </div>
            }
          >
            <ProjectCanvasView
              key={state.project.id}
              project={state.project}
              header={<ProjectHeader project={state.project} />}
            />
          </Suspense>
        </div>
      ) : (
        <div
          className={cn(
            "mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8",
            // Fill the content area below AppShell's h-14 header so messages centre in it.
            message && "min-h-[calc(100dvh-theme(spacing.14))]",
          )}
        >
          {state.status === "loading" && (
            <div role="status" aria-live="polite">
              <h1 className="sr-only">{p.loading}</h1>
              <div aria-hidden="true" className="space-y-6">
                <div className="h-9 w-2/3 rounded bg-muted" />
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="h-[50vh] rounded-md border border-border bg-card" />
              </div>
            </div>
          )}

          {state.status === "error" && (
            <div className="m-auto w-full max-w-md text-center">
              <h1 className={H1}>{p.errorTitle}</h1>
              <p className="mt-3 text-[15px] text-muted-foreground">{p.error}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button type="button" onClick={retry}>
                  {p.retry}
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard">{p.backToProjects}</Link>
                </Button>
              </div>
            </div>
          )}

          {state.status === "not-found" && (
            <div className="m-auto w-full max-w-md text-center">
              <h1 className={H1}>{p.notFoundTitle}</h1>
              {/* Never echo the URL id: it is attacker-controlled text (content spoofing). */}
              <p className="mt-3 text-[15px] text-muted-foreground">{p.notFound}</p>
              <Button asChild className="mt-6">
                <Link to="/dashboard">{p.backToProjects}</Link>
              </Button>
            </div>
          )}

          {state.status === "unavailable" && (
            <div className="m-auto w-full max-w-md text-center">
              <h1 className={H1}>{p.unavailableTitle}</h1>
              <p className="mt-3 text-[15px] text-muted-foreground">{p.unavailable}</p>
              <Button asChild className="mt-6">
                <Link to="/dashboard">{p.backToProjects}</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function ProjectHeader({ project }: { project: ApiProject }) {
  const t = useI18n();
  const p = t.project;
  const deployed = formatRelativeTime(t.locale, project.deployedAt, t.dashboard.justNow);

  return (
    <header>
      <h1 className={H1}>{project.name}</h1>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>{plural(t.locale, p.servicesCount, project.services.length)}</span>
        <span>
          {p.lastDeploy}:{" "}
          {deployed ? (
            <time
              dateTime={project.deployedAt}
              title={deployed.absolute}
              className="tabular-nums text-foreground"
            >
              {deployed.relative}
            </time>
          ) : (
            <span className="text-foreground">{p.neverDeployed}</span>
          )}
        </span>
        {project.repo && (
          <span className="inline-flex min-w-0 items-start gap-1.5">
            <GitBranch size={13} strokeWidth={1.5} aria-hidden="true" className="mt-1 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {p.providers[project.repo.provider]} · {project.repo.owner}/{project.repo.name}
            </span>
          </span>
        )}
      </p>
    </header>
  );
}
