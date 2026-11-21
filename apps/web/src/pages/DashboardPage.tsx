import { useState } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { LayoutGrid, LayoutList, Plus, Search, Columns2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { formatNumber } from "@/i18n/format";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { PROJECTS } from "@/lib/mock-data";
import type { Project } from "@/types/project";

type CardSize = "sm" | "md" | "lg";

// Columns follow the space the grid actually has (the sidebar eats into the viewport),
// so cards never shrink below a readable width.
const GRID_COLS: Record<CardSize, string> = {
  sm: "grid-cols-cards-sm",
  md: "grid-cols-cards-md",
  lg: "grid-cols-cards-lg",
};

export function DashboardPage() {
  const t = useI18n();
  const d = t.dashboard;
  const [size, setSize] = useState<CardSize>("md");
  const [search, setSearch] = useState("");
  // Seeded from mock data until the API exists; new projects live in memory only.
  const [projects, setProjects] = useState<Project[]>(PROJECTS);

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  // Rendered at two DOM positions (one hidden per breakpoint) so tab order follows the layout.
  const newProject = (visibility: string) => (
    <CreateProjectDialog
      existingProjects={projects}
      onCreate={(project) => setProjects((prev) => [project, ...prev])}
      trigger={
        <button
          type="button"
          className={cn(
            "h-[30px] shrink-0 items-center gap-1.5 rounded bg-primary px-3 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            visibility,
          )}
        >
          <Plus size={12} aria-hidden="true" />
          {d.projects.new}
        </button>
      }
    />
  );

  return (
    <AppShell
      header={
        // Below lg the tools drop to a second row so "New project" always stays on screen.
        <div className="flex w-full flex-wrap items-center gap-x-3 lg:flex-nowrap">
          <div className="mr-auto flex h-14 min-w-0 items-center">
            <div className="flex items-baseline gap-2">
              <h1 className="text-[14px] font-semibold text-foreground">{d.projects.title}</h1>
              <span className="text-[12px] tabular-nums text-muted-foreground">
                {formatNumber(t.locale, filtered.length)}
              </span>
            </div>
          </div>

          {/* Below lg "New project" sits on the first row, so it comes first in the DOM too. */}
          {newProject("flex lg:hidden")}

          {/* Search + size toggle: full-width second row below lg */}
          <div className="order-last flex w-full items-center gap-2 pb-3 lg:order-none lg:w-auto lg:pb-0">
            {/* Search */}
            <div className="relative flex min-w-0 flex-1 items-center lg:flex-none">
              <Search
                size={13}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-2.5 text-muted-foreground"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={d.projects.searchPlaceholder}
                aria-label={d.projects.searchPlaceholder}
                className="h-[30px] w-full rounded border border-border bg-transparent pl-7 pr-3 text-[12px] text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 lg:w-[280px] coarse:text-base"
              />
            </div>

            {/* Size toggle */}
            <ToggleGroup.Root
              type="single"
              value={size}
              onValueChange={(v) => v && setSize(v as CardSize)}
              aria-label="Card size"
              className="flex h-[30px] shrink-0 items-center rounded border border-border bg-transparent p-0.5"
            >
              {(
                [
                  { value: "sm", Icon: LayoutGrid, label: d.size.sm },
                  { value: "md", Icon: Columns2, label: d.size.md },
                  { value: "lg", Icon: LayoutList, label: d.size.lg },
                ] as const
              ).map(({ value, Icon, label }) => (
                <ToggleGroup.Item
                  key={value}
                  value={value}
                  aria-label={label}
                  className={cn(
                    "flex size-6 items-center justify-center rounded transition-colors",
                    "text-muted-foreground hover:text-foreground",
                    "data-[state=on]:bg-accent data-[state=on]:text-foreground",
                  )}
                >
                  <Icon size={13} strokeWidth={1.5} />
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          </div>

          {newProject("hidden lg:flex")}
        </div>
      }
    >
      <div className="px-4 py-5 sm:px-6">
        {filtered.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              {search ? `${d.projects.noResults} "${search}"` : d.projects.empty}
            </p>
          </div>
        ) : (
          <div className={cn("grid gap-3", GRID_COLS[size])}>
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
