import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { ChevronDown, Globe, LayoutList, Plus, Server, Workflow, Wand2 } from "lucide-react";
import type { ApiProject } from "@/api";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useCanvasServices } from "./data";
import { NARROW_QUERY, useMediaQuery } from "./hooks";
import type { ServiceCanvasHandle } from "./ServiceCanvas";
import { ServiceList } from "./ServiceList";
import type { AddedService } from "./storage";
import { fill } from "./text";
import type { AddKind } from "./AddServiceDialog";
import type { CanvasDomain, Point, ProjectView } from "./types";
import { useProjectGraph } from "./use-project-graph";

// React Flow + d3 is ~65 kB gzip; only the canvas view downloads it (not the list).
const ServiceCanvas = lazy(() => import("./ServiceCanvas"));
// The sheet and the add dialog get their own chunks, fetched as soon as the project has
// loaded (they render closed), so a first open is instant without growing the entry bundle.
const ServiceSheet = lazy(() =>
  import("./ServiceSheet").then((module) => ({ default: module.ServiceSheet })),
);
const AddServiceDialog = lazy(() =>
  import("./AddServiceDialog").then((module) => ({ default: module.AddServiceDialog })),
);

/** `?node=<id>` holds the open sheet (service or domain), so Back closes it and a link opens it. */
const SHEET_PARAM = "node";
/** Links from before domains existed: `?service=<id>`, rewritten to `?node=`. */
const LEGACY_SHEET_PARAM = "service";

const ITEM = cn(
  "flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors coarse:h-9",
  "text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
);
const MENU_ITEM =
  "flex h-8 cursor-pointer items-center gap-2 rounded px-2.5 text-[13px] text-foreground outline-none data-[highlighted]:bg-accent coarse:h-10";
const TOOL = cn(
  "flex h-[30px] items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors coarse:h-[38px]",
  "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

/** Find the node or list row for a service or domain, in whichever view is showing. */
function findServiceElement(root: HTMLElement | null, id: string): HTMLElement | undefined {
  if (!root) return undefined;
  return Array.from(
    root.querySelectorAll<HTMLElement>("[data-service-id], [data-domain-id], .react-flow__node"),
  ).find(
    (element) =>
      (element.dataset.serviceId ?? element.dataset.domainId ?? element.dataset.id) === id,
  );
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
  const base = useCanvasServices(project);
  const graph = useProjectGraph(project.id, base);
  const services = graph?.services ?? null;
  const domains = graph?.domains ?? null;

  // ─── View: list below 768px, canvas above; follows resizes until the user picks one.
  const narrow = useMediaQuery(NARROW_QUERY);
  const [view, setView] = useState<ProjectView>(() =>
    window.matchMedia(NARROW_QUERY).matches ? "list" : "canvas",
  );
  const picked = useRef(false);
  useEffect(() => {
    if (!picked.current) setView(narrow ? "list" : "canvas");
  }, [narrow]);
  const [announcement, setAnnouncement] = useState("");
  const changeView = (value: string) => {
    if (value !== "canvas" && value !== "list") return;
    picked.current = true;
    setView(value);
    setAnnouncement(value === "list" ? c.announceList : c.announceCanvas);
  };

  // ─── Sheet, in the URL.
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const requested = params.get(SHEET_PARAM) ?? params.get(LEGACY_SHEET_PARAM);
  const openId =
    requested &&
    (services?.some((service) => service.id === requested) ||
      domains?.some((domain) => domain.id === requested))
      ? requested
      : null;
  // Old `?service=` links keep working: same entry, new name.
  useEffect(() => {
    if (!params.has(LEGACY_SHEET_PARAM)) return;
    setParams(
      (current) => {
        const id = current.get(LEGACY_SHEET_PARAM);
        current.delete(LEGACY_SHEET_PARAM);
        if (id && !current.has(SHEET_PARAM)) current.set(SHEET_PARAM, id);
        return current;
      },
      { replace: true, state: location.state },
    );
  }, [params, setParams, location.state]);
  // Kept after close so the sheet can fade out, and so focus can go back to the card.
  const [shownId, setShownId] = useState<string | null>(null);
  useEffect(() => {
    if (openId) setShownId(openId);
  }, [openId]);
  // A link to a service that doesn't exist: drop the param rather than show nothing.
  useEffect(() => {
    if (services && requested && !openId) {
      setParams(
        (current) => {
          current.delete(SHEET_PARAM);
          current.delete(LEGACY_SHEET_PARAM);
          return current;
        },
        { replace: true },
      );
    }
  }, [services, requested, openId, setParams]);

  const open = useCallback(
    (id: string) =>
      setParams(
        (current) => {
          current.set(SHEET_PARAM, id);
          return current;
        },
        // Switching services while one is open replaces the entry, so Back closes in one step.
        { replace: params.has(SHEET_PARAM), state: { sheet: true } },
      ),
    [setParams, params],
  );
  const close = () => {
    // Opened here: step back, so Back and Close agree. Deep link: just drop the param.
    if ((location.state as { sheet?: boolean } | null)?.sheet) navigate(-1);
    else
      setParams(
        (current) => {
          current.delete(SHEET_PARAM);
          current.delete(LEGACY_SHEET_PARAM);
          return current;
        },
        { replace: true },
      );
  };

  const rootRef = useRef<HTMLDivElement>(null);
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    if (shownId) findServiceElement(rootRef.current, shownId)?.focus();
  };

  // ─── Adding and arranging.
  const canvasRef = useRef<ServiceCanvasHandle>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [adding, setAdding] = useState<{
    position?: Point;
    fromCanvas: boolean;
    kind: AddKind;
  } | null>(null);
  const addedId = useRef<string | null>(null);
  const addingRef = useRef(false);
  addingRef.current = adding !== null;

  const startAdd = (kind: AddKind) => {
    addedId.current = null;
    addingRef.current = true;
    setAdding({ fromCanvas: false, kind });
  };
  const requestAddAt = useCallback((position: Point) => {
    addedId.current = null;
    setAdding({ fromCanvas: true, position, kind: "service" });
  }, []);
  const add = (service: AddedService) => {
    // Toolbar: a free spot in the middle of the view. Right-click: where the click was.
    const position = adding?.position ?? canvasRef.current?.freeSpot();
    graph?.addService(service, position);
    addedId.current = service.id;
    setAnnouncement(fill(c.added, { name: service.name }));
  };
  const addDomain = (domain: CanvasDomain) => {
    // Right-click: where the click was. Otherwise left of its service, or a free spot in view.
    const position = adding?.position ?? canvasRef.current?.freeSpot("domain", domain.target);
    graph?.addDomain(domain, position);
    addedId.current = domain.id;
    setAnnouncement(fill(t.project.domain.added, { name: domain.hostname }));
  };
  const afterAddClosed = (event: Event) => {
    event.preventDefault();
    const id = addedId.current;
    // A new card on the canvas takes focus; otherwise focus goes back where it came from.
    if (id && view === "canvas") canvasRef.current?.focusService(id);
    else if (id) requestAnimationFrame(() => findServiceElement(rootRef.current, id)?.focus());
    else addButtonRef.current?.focus();
  };

  const shown = services?.find((service) => service.id === shownId) ?? null;
  const shownDomain = domains?.find((domain) => domain.id === shownId) ?? null;
  const empty = services !== null && services.length === 0;

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8">
        <div className="min-w-0 flex-1 basis-72">{header}</div>
        {services !== null && (
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <button ref={addButtonRef} type="button" className={TOOL}>
                  <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
                  {c.add}
                  <ChevronDown
                    size={12}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="text-muted-foreground"
                  />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  aria-label={c.addMenu}
                  // The dialog opened from the menu owns focus; don't pull it back to the trigger.
                  onCloseAutoFocus={(event) => addingRef.current && event.preventDefault()}
                  className="z-50 w-44 animate-fade-in rounded-md border border-border bg-card p-1 shadow-lg"
                >
                  <DropdownMenu.Item className={MENU_ITEM} onSelect={() => startAdd("service")}>
                    <Server
                      size={13}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="text-muted-foreground"
                    />
                    {c.addServiceItem}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className={MENU_ITEM} onSelect={() => startAdd("domain")}>
                    <Globe
                      size={13}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="text-muted-foreground"
                    />
                    {c.addDomainItem}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            {!empty && view === "canvas" && (
              <button
                type="button"
                onClick={() => canvasRef.current?.autoArrange()}
                className={TOOL}
              >
                <Wand2 size={13} strokeWidth={1.5} aria-hidden="true" />
                {c.autoArrange}
              </button>
            )}
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
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {services === null || !graph ? (
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
          <ServiceList services={services} domains={graph.domains} onOpen={open} />
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
              <ServiceCanvas
                ref={canvasRef}
                services={services}
                domains={graph.domains}
                edges={graph.edges}
                positions={graph.positions}
                onOpen={open}
                onConnect={graph.connect}
                onDisconnect={graph.disconnect}
                onPositionsChange={graph.savePositions}
                onRequestAdd={requestAddAt}
              />
            </Suspense>
          </div>
        </div>
      )}

      {graph && (
        <Suspense fallback={null}>
          <ServiceSheet
            open={openId !== null}
            service={shown}
            domain={shownDomain}
            services={graph.services}
            edges={graph.edges}
            domains={graph.domains}
            onConnect={graph.connect}
            onDisconnect={graph.disconnect}
            onDomainChange={graph.updateDomain}
            onOpenChange={(next) => !next && close()}
            onCloseAutoFocus={restoreFocus}
          />
        </Suspense>
      )}
      {graph && (
        <Suspense fallback={null}>
          <AddServiceDialog
            open={adding !== null}
            initialKind={adding?.kind}
            existingNames={graph.services.map((service) => service.name)}
            services={graph.services}
            domainNames={graph.domains.map((domain) => domain.id)}
            onOpenChange={(next) => !next && setAdding(null)}
            onAdd={add}
            onAddDomain={addDomain}
            onCloseAutoFocus={afterAddClosed}
          />
        </Suspense>
      )}
    </div>
  );
}
