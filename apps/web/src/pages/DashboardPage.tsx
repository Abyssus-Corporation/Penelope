import { useState } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import {
  LayoutGrid,
  LayoutList,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Columns2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { PROJECTS } from "@/lib/mock-data";

type CardSize = "sm" | "md" | "lg";

const GRID_COLS: Record<CardSize, string> = {
  sm: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  md: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  lg: "grid-cols-1 sm:grid-cols-1 lg:grid-cols-2",
};

export function DashboardPage() {
  const t = useI18n();
  const d = t.dashboard;
  const [collapsed, setCollapsed] = useState(false);
  const [size, setSize] = useState<CardSize>("md");
  const [search, setSearch] = useState("");

  const filtered = PROJECTS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-screen bg-background">
      <Sidebar collapsed={collapsed} />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          {/* Left: collapse + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen size={15} strokeWidth={1.5} />
              ) : (
                <PanelLeftClose size={15} strokeWidth={1.5} />
              )}
            </button>
            <div className="flex items-baseline gap-2">
              <h1 className="text-[14px] font-semibold text-foreground">{d.projects.title}</h1>
              <span className="text-[12px] tabular-nums text-muted-foreground/60">
                {filtered.length}
              </span>
            </div>
          </div>

          {/* Right: search + size toggle + new button */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex items-center">
              <Search
                size={13}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-2.5 text-muted-foreground/50"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={d.projects.searchPlaceholder}
                className="h-[30px] w-[200px] rounded border border-border bg-transparent pl-7 pr-3 text-[12px] text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-foreground/30 focus:outline-none"
              />
            </div>

            {/* Size toggle */}
            <ToggleGroup.Root
              type="single"
              value={size}
              onValueChange={(v) => v && setSize(v as CardSize)}
              className="flex h-[30px] items-center rounded border border-border bg-transparent p-0.5"
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
                    "flex size-[22px] items-center justify-center rounded transition-colors",
                    "text-muted-foreground/50 hover:text-muted-foreground",
                    "data-[state=on]:bg-accent data-[state=on]:text-foreground",
                  )}
                >
                  <Icon size={13} strokeWidth={1.5} />
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>

            {/* New project */}
            <button className="flex h-[30px] items-center gap-1.5 rounded bg-primary px-3 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
              <Plus size={12} />
              {d.projects.new}
            </button>
          </div>
        </header>

        {/* Projects grid */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
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
      </main>
    </div>
  );
}
