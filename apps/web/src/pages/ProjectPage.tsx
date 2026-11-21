import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, GitBranch } from "lucide-react";
import { api, type ApiProject } from "@/api";
import { StatusDot } from "@/components/dashboard/ProjectCard";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "not-found" }
  | { status: "ready"; project: ApiProject };

const H1 = "break-words font-display text-[2rem] font-light leading-tight tracking-[-0.03em]";
const SECTION = "rounded-md border border-border bg-card p-4 sm:p-5";
const H2 = "text-sm font-medium text-foreground";

function formatDeployedAt(value: string): { text: string; dateTime?: string } | null {
  if (!value) return null;
  const time = Date.parse(value);
  // Mock data still uses display strings like "4m ago"; show those as they are.
  if (Number.isNaN(time)) return { text: value };
  return {
    text: new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
      time,
    ),
    dateTime: new Date(time).toISOString(),
  };
}

function useProject(id: string) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    api.projects.get(id).then(
      (project) =>
        active && setState(project ? { status: "ready", project } : { status: "not-found" }),
      () => active && setState({ status: "error" }),
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

  const crumb =
    state.status === "ready"
      ? state.project.name
      : state.status === "not-found"
        ? p.notFoundTitle
        : state.status === "error"
          ? p.errorTitle
          : p.loading;

  return (
    <AppShell
      header={
        <nav aria-label={p.breadcrumb}>
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
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {state.status === "loading" && (
          <div role="status" aria-live="polite">
            <h1 className="sr-only">{p.loading}</h1>
            <div aria-hidden="true" className="space-y-6">
              <div className="h-9 w-2/3 rounded bg-muted" />
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className={`${SECTION} h-40`} />
              <div className={`${SECTION} h-24`} />
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="max-w-md">
            <h1 className={H1}>{p.errorTitle}</h1>
            <p className="mt-3 text-[15px] text-muted-foreground">{p.error}</p>
            <Button type="button" className="mt-6" onClick={retry}>
              {p.retry}
            </Button>
          </div>
        )}

        {state.status === "not-found" && (
          <div className="max-w-md">
            <h1 className={H1}>{p.notFoundTitle}</h1>
            <p className="mt-3 break-words text-[15px] text-muted-foreground">
              {p.notFound.replace("{id}", id)}
            </p>
          </div>
        )}

        {state.status === "ready" && <ProjectDetails project={state.project} />}
      </div>
    </AppShell>
  );
}

function ProjectDetails({ project }: { project: ApiProject }) {
  const t = useI18n();
  const p = t.project;
  const deployed = formatDeployedAt(project.deployedAt);
  const count = project.services.length;
  const servicesLabel = (count === 1 ? p.servicesCount.one : p.servicesCount.other).replace(
    "{n}",
    count.toLocaleString(),
  );

  return (
    <article className="space-y-6">
      <header>
        <h1 className={H1}>{project.name}</h1>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{servicesLabel}</span>
          <span>
            {p.lastDeploy}:{" "}
            {deployed ? (
              <time dateTime={deployed.dateTime} className="tabular-nums text-foreground">
                {deployed.text}
              </time>
            ) : (
              <span className="text-foreground">{p.neverDeployed}</span>
            )}
          </span>
        </p>
      </header>

      <section aria-labelledby="services-heading" className={SECTION}>
        <h2 id="services-heading" className={H2}>
          {p.services}
        </h2>
        {count === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{p.noServices}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {project.services.map((service) => (
              <li key={service.name} className="flex items-start gap-3 py-2.5">
                <span className="flex h-5 w-2.5 shrink-0 items-center justify-center">
                  <StatusDot status={service.status} />
                </span>
                <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">
                  {service.name}
                </span>
                <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
                  {t.dashboard.service[service.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="repo-heading" className={SECTION}>
        <h2 id="repo-heading" className={H2}>
          {p.repository}
        </h2>
        {project.repo ? (
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="sr-only">{p.providers[project.repo.provider]}</dt>
              <dd className="flex items-start gap-2 text-foreground">
                <GitBranch size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
                <span className="min-w-0 break-words">
                  <span className="text-muted-foreground">
                    {p.providers[project.repo.provider]} ·{" "}
                  </span>
                  {project.repo.owner}/{project.repo.name}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{p.lastCommit}</dt>
              <dd className="mt-1 break-words text-foreground">
                {project.repo.lastCommit ? (
                  <>
                    <code className="mr-2 font-mono text-[13px] text-muted-foreground">
                      {project.repo.lastCommit.id.slice(0, 7)}
                    </code>
                    {project.repo.lastCommit.message}
                  </>
                ) : (
                  <span className="text-muted-foreground">{p.noCommit}</span>
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{p.noRepository}</p>
        )}
      </section>
    </article>
  );
}
