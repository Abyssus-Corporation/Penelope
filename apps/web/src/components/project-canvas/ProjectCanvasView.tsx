import { Suspense, lazy, useCallback, useRef, useState, type ReactNode } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { LayoutList, Workflow } from "lucide-react";
import type { ApiProject } from "@/api";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useCanvasServices } from "./data";
import { NARROW_QUERY } from "./hooks";
import { ServiceList } from "./ServiceList";
import { ServiceSheet } from "./ServiceSheet";
import type { ProjectView } from "./types";

// React Flow + d3 is ~90 kB gzip; only the canvas view downloads it (not the list).
const ServiceCanvas = lazy(() => import("./ServiceCanvas"));

const ITEM = cn(
  "flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors coarse:h-9",
  "text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
);

/** Find the node or list row for a service, in whichever view is showing. */
function findServiceElement(root: HTMLElement | null, id: string): HTMLElement | undefined {
  if (!root) return undefined;
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-service-id], .react-flow__node"),
  ).find((element) => (element.dataset.serviceId ?? element.dataset.id) === id);
}

export function ProjectCanvasView({
  project,
  header,
}: {
  project: ApiProject;
  /** Project title block; the view toggle sits beside it. */
  header: ReactNode;
}) {
  const t = useI18n();
  const c = t.project.canvas;
  const services = useCanvasServices(project);
  const [view, setView] = useState<ProjectView>(() =>
    window.matchMedia(NARROW_QUERY).matches ? "list" : "canvas",
  );
  const [announcement, setAnnouncement] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const open = useCallback((id: string) => {
    setOpenId(id);
    setShownId(id);
  }, []);

  const changeView = (value: string) => {
    if (value !== "canvas" && value !== "list") return;
    setView(value);
    setAnnouncement(value === "list" ? c.announceList : c.announceCanvas);
  };

  const restoreFocus = (event: Event) => {
    event.preventDefault();
    if (shownId) findServiceElement(rootRef.current, shownId)?.focus();
  };

  const shown = services?.find((service) => service.id === shownId) ?? null;
  const empty = services !== null && services.length === 0;

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
        <div className="min-w-0 flex-1 basis-72">{header}</div>
        {!empty && (
          <ToggleGroup.Root
            type="single"
            value={view}
            onValueChange={changeView}
            aria-label={c.views}
            className="flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-muted p-0.5"
          >
            <ToggleGroup.Item value="canvas" className={ITEM}>
              <Workflow size={13} strokeWidth={1.5} aria-hidden="true" />
              {c.canvasView}
            </ToggleGroup.Item>
            <ToggleGroup.Item value="list" className={ITEM}>
              <LayoutList size={13} strokeWidth={1.5} aria-hidden="true" />
              {c.listView}
            </ToggleGroup.Item>
          </ToggleGroup.Root>
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {services === null ? (
        <p role="status" className="px-4 text-sm text-muted-foreground sm:px-6">
          {c.loading}
        </p>
      ) : empty ? (
        <div className="px-4 pb-8 sm:px-6">
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">{t.project.noServices}</p>
          </div>
        </div>
      ) : view === "list" ? (
        <div className="px-4 pb-8 sm:px-6">
          <ServiceList services={services} onOpen={open} />
        </div>
      ) : (
        // Fills the rest of the viewport; at least 420px so short windows still pan.
        <div className="relative min-h-[420px] flex-1 border-t border-border bg-background">
          <div className="absolute inset-0">
            <Suspense
              fallback={
                <p role="status" className="p-6 text-sm text-muted-foreground">
                  {c.loading}
                </p>
              }
            >
              <ServiceCanvas projectId={project.id} services={services} onOpen={open} />
            </Suspense>
          </div>
        </div>
      )}

      <ServiceSheet
        open={openId !== null}
        service={shown}
        onOpenChange={(next) => !next && setOpenId(null)}
        onCloseAutoFocus={restoreFocus}
      />
    </div>
  );
}
