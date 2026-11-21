import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import {
  LayoutGrid,
  LayoutList,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Columns2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { formatNumber } from "@/i18n/format";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Sidebar } from "@/components/layout/Sidebar";
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

const ICON_BUTTON =
  "flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

/** Below `md` the sidebar leaves the layout and opens as a modal drawer instead. */
function MobileNav({ label, title }: { label: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger className={cn(ICON_BUTTON, "md:hidden")} aria-label={label}>
        <Menu size={15} strokeWidth={1.5} aria-hidden="true" />
      </DialogPrimitive.Trigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
          className="fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-background shadow-xl focus:outline-none data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in"
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <Sidebar collapsed={false} className="w-full" />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export function DashboardPage() {
  const t = useI18n();
  const d = t.dashboard;
  const [collapsed, setCollapsed] = useState(false);
  const [size, setSize] = useState<CardSize>("md");
  const [search, setSearch] = useState("");
  // Seeded from mock data until the API exists; new projects live in memory only.
  const [projects, setProjects] = useState<Project[]>(PROJECTS);

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-dvh bg-background">
      <Sidebar collapsed={collapsed} className="hidden md:flex" />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 flex-col overflow-hidden outline-none"
      >
        {/* Header */}
        {/* Below lg the tools drop to a second row so "New project" always stays on screen. */}
        <header className="flex shrink-0 flex-wrap items-center gap-x-3 border-b border-border px-4 lg:flex-nowrap">
          {/* Left: menu or collapse + title */}
          <div className="mr-auto flex h-14 min-w-0 items-center gap-3">
            <MobileNav label={d.nav.openNavigation} title={d.nav.navigation} />
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={cn(ICON_BUTTON, "hidden md:flex")}
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
              <span className="text-[12px] tabular-nums text-muted-foreground">
                {formatNumber(t.locale, filtered.length)}
              </span>
            </div>
          </div>

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

          {/* New project */}
          <CreateProjectDialog
            existingProjects={projects}
            onCreate={(project) => setProjects((prev) => [project, ...prev])}
            trigger={
              <button
                type="button"
                className="flex h-[30px] shrink-0 items-center gap-1.5 rounded bg-primary px-3 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <Plus size={12} aria-hidden="true" />
                {d.projects.new}
              </button>
            }
          />
        </header>

        {/* Projects grid */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
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
