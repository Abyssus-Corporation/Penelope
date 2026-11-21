import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useNodes,
  useNodesInitialized,
  useReactFlow,
  useStore,
  useStoreApi,
  type Connection,
  type Edge,
  type EdgeChange,
  type FinalConnectionState,
  type NodeMouseHandler,
  type OnNodesChange,
} from "@xyflow/react";
// Same-origin stylesheet: Vite emits it as a hashed /assets/*.css file linked by
// this lazy chunk. React Flow itself only sets inline style attributes
// (transforms), which style-src allows; it never injects <style> elements.
import "@xyflow/react/dist/base.css";
import { Maximize, Minus, Plus } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { chooseFit } from "./fit";
import {
  DEFAULT_DOMAIN_HEIGHT,
  DEFAULT_NODE_HEIGHT,
  DOMAIN_WIDTH,
  NODE_WIDTH,
  COLUMN_GAP,
  findFreeSpot,
  layoutServices,
} from "./graph";
import { DomainNode, type DomainNodeType } from "./DomainNode";
import type { GraphLinkError } from "./use-project-graph";
import { NARROW_QUERY, useMediaQuery, useReducedMotion } from "./hooks";
import { ARRANGE_MS, easeInOut } from "./motion";
import { fill } from "./text";
import { ConnectionLine } from "./ConnectionLine";
import { EdgeActions, EdgeRoutes } from "./edge-actions";
import { useEdgeRoutes } from "./use-edge-routes";
import { ServiceEdge, type ServiceEdgeType } from "./ServiceEdge";
import { ServiceNode, type ServiceNodeType } from "./ServiceNode";
import { POSITION_LIMIT, type Positions } from "./storage";
import type { CanvasDomain, CanvasService, Point, ServiceEdge as GraphEdge } from "./types";

type CanvasNode = ServiceNodeType | DomainNodeType;
const nodeTypes = { service: ServiceNode, domain: DomainNode };
/** How long a visible link notice (replaced, rejected) stays up. */
const NOTICE_MS = 5000;
const edgeTypes = { service: ServiceEdge };
const NODE_EXTENT: [[number, number], [number, number]] = [
  [-POSITION_LIMIT, -POSITION_LIMIT],
  [POSITION_LIMIT, POSITION_LIMIT],
];
/** Arrow-key step for a focused card; Shift moves five times as far. */
const KEY_STEP = 10;
const LONG_PRESS_MS = 550;
const ARROWS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

export interface ServiceCanvasProps {
  services: CanvasService[];
  domains: CanvasDomain[];
  edges: GraphEdge[];
  /** Saved positions; read on mount and for services added later. */
  positions: Positions;
  onOpen: (serviceId: string) => void;
  onConnect: (source: string, target: string) => GraphLinkError | null;
  onDisconnect: (edgeId: string) => void;
  onPositionsChange: (positions: Positions) => void;
  /** Right-click (or long-press) on the background: add a service at this flow point. */
  onRequestAdd: (position: Point) => void;
}

export interface ServiceCanvasHandle {
  /** A free card-sized spot near the middle of what's on screen. */
  /** A free spot in view; for a domain with a target, left of that service. */
  freeSpot: (kind?: "service" | "domain", target?: string | null) => Point;
  autoArrange: () => void;
  focusService: (id: string) => void;
}

const ServiceCanvas = forwardRef<ServiceCanvasHandle, ServiceCanvasProps>(
  function ServiceCanvas(props, ref) {
    return (
      <ReactFlowProvider>
        <Canvas {...props} handleRef={ref} />
      </ReactFlowProvider>
    );
  },
);
export default ServiceCanvas;

function toNode(service: CanvasService, position: Point, roleDescription: string): ServiceNodeType {
  return {
    id: service.id,
    type: "service",
    position,
    data: { service },
    className: "group rounded-lg outline-none",
    deletable: false,
    ariaRole: "button",
    domAttributes: { "aria-haspopup": "dialog", "aria-roledescription": roleDescription },
  };
}

function toDomainNode(
  domain: CanvasDomain,
  position: Point,
  roleDescription: string,
): DomainNodeType {
  return {
    id: domain.id,
    type: "domain",
    position,
    data: { domain },
    className: "group rounded-lg outline-none",
    deletable: false,
    ariaRole: "button",
    domAttributes: { "aria-haspopup": "dialog", "aria-roledescription": roleDescription },
  };
}

const own = (record: object, key: string) => Object.prototype.hasOwnProperty.call(record, key);

function Canvas({
  services,
  domains,
  edges,
  positions,
  onOpen,
  onConnect,
  onDisconnect,
  onPositionsChange,
  onRequestAdd,
  handleRef,
}: ServiceCanvasProps & { handleRef: ForwardedRef<ServiceCanvasHandle> }) {
  const t = useI18n();
  const c = t.project.canvas;
  const d = t.project.domain;
  const instructionsId = useId();
  const reducedMotion = useReducedMotion();
  const narrow = useMediaQuery(NARROW_QUERY);
  const flow = useReactFlow<CanvasNode, ServiceEdgeType>();
  const store = useStoreApi();
  const sectionRef = useRef<HTMLElement>(null);
  const [announcement, setAnnouncement] = useState("");

  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const servicesRef = useRef(services);
  servicesRef.current = services;
  const domainsRef = useRef(domains);
  domainsRef.current = domains;

  // Saved positions win; everything else starts on the estimated layout and is
  // re-stacked once React Flow has measured the real card heights (below).
  const [savedIds] = useState(
    () =>
      new Set(
        [...services.map((s) => s.id), ...domains.map((domain) => domain.id)].filter((id) =>
          own(positions, id),
        ),
      ),
  );
  const [nodes, setNodes] = useState<CanvasNode[]>(() => {
    const layout = layoutServices(services, {}, domains);
    const at = (id: string) => positions[id] ?? layout[id] ?? { x: 0, y: 0 };
    return [
      ...services.map((service) => toNode(service, at(service.id), c.nodeRole)),
      ...domains.map((domain) => toDomainNode(domain, at(domain.id), d.role)),
    ];
  });

  // Services and domains added or relinked elsewhere (toolbar, sheet): keep cards in step.
  useEffect(() => {
    setNodes((current) => {
      const byId = new Map(current.map((node) => [node.id, node]));
      let layout: ReturnType<typeof layoutServices> | null = null;
      const at = (id: string) => {
        layout ??= layoutServices(services, {}, domains);
        return positionsRef.current[id] ?? layout[id] ?? { x: 0, y: 0 };
      };
      return [
        ...services.map((service): CanvasNode => {
          const node = byId.get(service.id);
          if (node?.type === "service") {
            return node.data.service === service ? node : { ...node, data: { service } };
          }
          return toNode(service, at(service.id), c.nodeRole);
        }),
        ...domains.map((domain): CanvasNode => {
          const node = byId.get(domain.id);
          if (node?.type === "domain") {
            return node.data.domain === domain ? node : { ...node, data: { domain } };
          }
          return toDomainNode(domain, at(domain.id), d.role);
        }),
      ];
    });
  }, [services, domains, c.nodeRole, d.role]);

  const fitTo = useCallback(
    (list: readonly CanvasNode[], duration: number) => {
      const { width, height } = store.getState();
      void flow.setViewport(chooseFit(list, { width, height }, narrow).viewport, { duration });
    },
    [store, flow, narrow],
  );

  // Before measuring, the window is the size estimate; the refit below uses the real size.
  const [initialViewport] = useState(
    () =>
      chooseFit(
        nodes,
        { width: window.innerWidth - (narrow ? 0 : 240), height: window.innerHeight - 200 },
        narrow,
      ).viewport,
  );

  // Wrapped names make some cards taller than the estimate. Once every card is
  // measured, stack each column on the real heights (unsaved cards only), then
  // re-run the first fit so the view matches the final layout.
  const measured = useNodesInitialized();
  const relaidOut = useRef(false);
  useEffect(() => {
    if (!measured || relaidOut.current) return;
    relaidOut.current = true;
    const heights: Record<string, number> = Object.create(null);
    for (const node of nodes) if (node.measured?.height) heights[node.id] = node.measured.height;
    const layout = layoutServices(services, heights, domains);
    const next = nodes.map((node) =>
      savedIds.has(node.id) || !layout[node.id] ? node : { ...node, position: layout[node.id]! },
    );
    if (savedIds.size < nodes.length) setNodes(next);
    requestAnimationFrame(() => fitTo(next, 0));
  }, [measured, nodes, services, domains, savedIds, fitTo]);

  // Persist once a move settles (drag end, an arrow-key step, an arrange), never mid-drag.
  const settled = useRef(false);
  const onNodesChange = useCallback<OnNodesChange<CanvasNode>>((changes) => {
    if (changes.some((change) => change.type === "position" && !change.dragging)) {
      settled.current = true;
    }
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);
  useEffect(() => {
    if (!settled.current) return;
    settled.current = false;
    const next: Positions = Object.create(null);
    for (const node of nodes) next[node.id] = node.position;
    onPositionsChange(next);
  }, [nodes, onPositionsChange]);

  // ─── Edges ────────────────────────────────────────────────────────────────
  const [selectedEdges, setSelectedEdges] = useState<ReadonlySet<string>>(() => new Set());
  const rfEdges = useMemo<ServiceEdgeType[]>(
    () =>
      edges.map((edge) => ({
        ...edge,
        type: "service",
        selected: selectedEdges.has(edge.id),
        // Not tab stops: 70 links would bury the cards in the tab order. Keyboard
        // users link and unlink from the sheet's Connections section.
        focusable: false,
        className: "text-muted-foreground/70 [&.selected]:text-foreground",
        ariaLabel: fill(c.edgeLabel, { source: edge.source, target: edge.target }),
        domAttributes: { "aria-roledescription": c.edgeRole },
        // null: the arrow takes --xy-edge-stroke, i.e. the token colour above.
        markerEnd: { type: MarkerType.ArrowClosed, color: null, width: 16, height: 16 },
      })),
    [edges, selectedEdges, c],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<ServiceEdgeType>[]) => {
      for (const change of changes) if (change.type === "remove") onDisconnect(change.id);
      if (!changes.some((change) => change.type === "select")) return;
      setSelectedEdges((current) => {
        const next = new Set(current);
        for (const change of changes) {
          if (change.type !== "select") continue;
          if (change.selected) next.add(change.id);
          else next.delete(change.id);
        }
        return next;
      });
    },
    [onDisconnect],
  );
  const edgeActions = useMemo(() => ({ remove: onDisconnect }), [onDisconnect]);
  const routes = useEdgeRoutes(nodes, edges);

  const ids = useMemo(() => new Set(services.map((service) => service.id)), [services]);
  const domainById = useMemo(
    () => new Map(domains.map((domain) => [domain.id, domain])),
    [domains],
  );
  // Domains link into services only; nothing links into a domain (it has no target handle).
  const isValidConnection = useCallback(
    (connection: Edge | Connection) =>
      connection.source !== connection.target &&
      (ids.has(connection.source) || domainById.has(connection.source)) &&
      ids.has(connection.target) &&
      !edges.some((edge) => edge.source === connection.source && edge.target === connection.target),
    [ids, domainById, edges],
  );

  // A visible, polite notice for link outcomes that aren't obvious from the canvas alone.
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number>();
  const showNotice = useCallback((message: string) => {
    window.clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = window.setTimeout(() => setNotice(""), NOTICE_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      const previous = domainById.get(connection.source)?.target ?? null;
      if (onConnect(connection.source, connection.target)) return;
      if (previous && previous !== connection.target) {
        // Decision: a domain routes to one service, so a new link replaces the old one.
        showNotice(
          fill(d.replaced, { domain: connection.source, from: previous, to: connection.target }),
        );
      } else {
        setAnnouncement(fill(c.linked, { source: connection.source, target: connection.target }));
      }
    },
    [onConnect, c, d, domainById, showNotice],
  );

  // ─── Adding, arranging ────────────────────────────────────────────────────
  const requestAddAt = useCallback(
    (clientX: number, clientY: number) => {
      const point = flow.screenToFlowPosition({ x: clientX, y: clientY });
      onRequestAdd({ x: point.x - NODE_WIDTH / 2, y: point.y - DEFAULT_NODE_HEIGHT / 2 });
    },
    [flow, onRequestAdd],
  );

  // Touch has no right-click: a long press on the background does the same.
  // (Android also fires contextmenu on long press; both open the same dialog.)
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    cancelPress();
    if (event.pointerType !== "touch" || !event.isPrimary) return;
    if (!(event.target as Element).classList.contains("react-flow__pane")) return;
    const { clientX: x, clientY: y } = event;
    press.current = {
      x,
      y,
      timer: window.setTimeout(() => {
        press.current = null;
        requestAddAt(x, y);
      }, LONG_PRESS_MS),
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (
      press.current &&
      Math.hypot(event.clientX - press.current.x, event.clientY - press.current.y) > 10
    ) {
      cancelPress();
    }
  };

  const animation = useRef(0);
  const autoArrange = useCallback(() => {
    cancelAnimationFrame(animation.current);
    const current = flow.getNodes();
    const heights: Record<string, number> = Object.create(null);
    for (const node of current) if (node.measured?.height) heights[node.id] = node.measured.height;
    const layout = layoutServices(servicesRef.current, heights, domainsRef.current);
    const target = current.map((node) => ({ ...node, position: layout[node.id] ?? node.position }));
    const finish = () => {
      settled.current = true;
      setNodes(target);
      requestAnimationFrame(() => fitTo(target, reducedMotion ? 0 : 200));
      setAnnouncement(c.arranged);
    };
    // Reduced motion: cards jump straight to their place.
    if (reducedMotion) return finish();
    const from = new Map(current.map((node) => [node.id, node.position]));
    const start = performance.now();
    const step = (now: number) => {
      const progress = easeInOut(Math.min(1, (now - start) / ARRANGE_MS));
      if (progress >= 1) return finish();
      setNodes((list) =>
        list.map((node) => {
          const a = from.get(node.id);
          const b = layout[node.id];
          if (!a || !b) return node;
          return {
            ...node,
            position: { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress },
          };
        }),
      );
      animation.current = requestAnimationFrame(step);
    };
    animation.current = requestAnimationFrame(step);
  }, [flow, fitTo, reducedMotion, c]);
  useEffect(() => () => cancelAnimationFrame(animation.current), []);

  useImperativeHandle(
    handleRef,
    () => ({
      freeSpot: (kind = "service", target = null) => {
        const rect = sectionRef.current?.getBoundingClientRect();
        const centre = rect
          ? flow.screenToFlowPosition({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            })
          : { x: 0, y: 0 };
        const boxes = flow.getNodes().map((node) => ({
          ...node.position,
          width: node.measured?.width ?? NODE_WIDTH,
          height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
        }));
        const size =
          kind === "domain"
            ? { width: DOMAIN_WIDTH, height: DEFAULT_DOMAIN_HEIGHT }
            : { width: NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
        const anchor = target ? flow.getNode(target) : undefined;
        return findFreeSpot(
          boxes,
          anchor
            ? { x: anchor.position.x - DOMAIN_WIDTH - COLUMN_GAP, y: anchor.position.y }
            : { x: centre.x - size.width / 2, y: centre.y - size.height / 2 },
          size,
        );
      },
      autoArrange,
      focusService: (id) => {
        // The card renders on the next commit; try for a few frames.
        let tries = 0;
        const attempt = () => {
          const card = sectionRef.current?.querySelector<HTMLElement>(
            `.react-flow__node[data-id="${CSS.escape(id)}"]`,
          );
          if (card) card.focus();
          else if (tries++ < 10) requestAnimationFrame(attempt);
        };
        requestAnimationFrame(attempt);
      },
    }),
    [flow, autoArrange],
  );

  // ─── Keyboard ─────────────────────────────────────────────────────────────
  // Capture phase, so React Flow's own node keys (Space selects, Esc blurs) never run:
  // Enter and Space open the card like any button, arrows move it, Esc keeps focus.
  const onKeyDownCapture = (event: KeyboardEvent<HTMLElement>) => {
    const card = event.target as HTMLElement;
    if (!card.classList.contains("react-flow__node")) return;
    const id = card.getAttribute("data-id");
    if (!id) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      // Without preventDefault, the same Enter press activates whatever button the
      // sheet focuses on open (its close button) and the sheet shuts straight away.
      if (!event.repeat) onOpen(id);
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setNodes((list) => list.map((node) => (node.selected ? { ...node, selected: false } : node)));
    } else if (own(ARROWS, event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const direction = ARROWS[event.key]!;
      const distance = KEY_STEP * (event.shiftKey ? 5 : 1);
      const clamp = (value: number) => Math.min(POSITION_LIMIT, Math.max(-POSITION_LIMIT, value));
      const node = nodes.find((item) => item.id === id);
      if (!node) return;
      const position = {
        x: clamp(node.position.x + direction.x * distance),
        y: clamp(node.position.y + direction.y * distance),
      };
      settled.current = true;
      setNodes((list) => list.map((item) => (item.id === id ? { ...item, position } : item)));
      setAnnouncement(
        fill(c.nodeMoved, { name: id, x: Math.round(position.x), y: Math.round(position.y) }),
      );
    }
  };

  // Dropping a link drag back on its own card ends in a click on that card; that drop
  // is a no-op, not a request to open the sheet.
  const linkDragEnded = useRef(0);
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      linkDragEnded.current = performance.now();
      if (state.isValid || !state.fromNode) return;
      // Dropped on a domain card: say why nothing happened.
      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      if (!point) return;
      const card = document
        .elementFromPoint(point.clientX, point.clientY)
        ?.closest<HTMLElement>(".react-flow__node");
      const id = card?.dataset.id;
      if (!id || !domainById.has(id) || id === state.fromNode.id) return;
      showNotice(domainById.has(state.fromNode.id) ? d.rejectDomainToDomain : d.rejectToDomain);
    },
    [domainById, d, showNotice],
  );
  const onNodeClick = useCallback<NodeMouseHandler<CanvasNode>>(
    (event, node) => {
      if (event.timeStamp - linkDragEnded.current < 300) return;
      onOpen(node.id);
    },
    [onOpen],
  );

  return (
    <section
      ref={sectionRef}
      aria-label={c.regionLabel}
      aria-describedby={instructionsId}
      onKeyDownCapture={onKeyDownCapture}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      className={cn(
        "relative h-full w-full [-webkit-touch-callout:none]",
        // React Flow reads these variables; point them at our tokens via currentColor.
        "[--xy-background-color:transparent] [--xy-edge-stroke-selected:currentColor] [--xy-edge-stroke-width:1.5] [--xy-edge-stroke:currentColor]",
        "[--xy-connectionline-stroke-width:1.5] [--xy-connectionline-stroke:currentColor]",
        // React Flow's attribution stays (MIT; see the PR notes), in our muted tokens: its
        // background via RF's own variable, its link via the panel's data-message attribute
        // (Tailwind would read the underscores in `.react-flow__attribution` as spaces); padded
        // to a 24px target (WCAG 2.5.8).
        "[--xy-attribution-background-color:transparent] [&_[data-message]_a]:block [&_[data-message]_a]:px-1 [&_[data-message]_a]:py-1.5 [&_[data-message]_a]:text-muted-foreground",
      )}
    >
      <p id={instructionsId} className="sr-only">
        {c.instructions}
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <EdgeActions.Provider value={edgeActions}>
        <EdgeRoutes.Provider value={routes}>
          <ReactFlow
            nodes={nodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onConnect={handleConnect}
            onConnectEnd={onConnectEnd}
            connectionLineComponent={ConnectionLine}
            isValidConnection={isValidConnection}
            onPaneContextMenu={(event) => {
              event.preventDefault();
              cancelPress();
              requestAddAt(event.clientX, event.clientY);
            }}
            nodeExtent={NODE_EXTENT}
            edgesFocusable={false}
            deleteKeyCode={["Delete", "Backspace"]}
            selectionKeyCode={null}
            multiSelectionKeyCode={null}
            zoomOnDoubleClick={false}
            minZoom={0.2}
            maxZoom={2}
            defaultViewport={initialViewport}
            className="text-foreground"
            ariaLabelConfig={{
              "node.a11yDescription.default": c.nodeDescription,
              "node.a11yDescription.keyboardDisabled": c.nodeDescription,
              // Unused (our own arrow-key handler announces moves) but kept translated.
              "node.a11yDescription.ariaLiveMessage": ({ x, y }) =>
                fill(c.nodeMovedShort, { x, y }),
              "edge.a11yDescription.default": c.edgeDescription,
              "handle.ariaLabel": c.handle,
              "controls.ariaLabel": c.controls,
              "controls.zoomIn.ariaLabel": c.zoomIn,
              "controls.zoomOut.ariaLabel": c.zoomOut,
              "controls.fitView.ariaLabel": c.fitView,
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.25}
              className="text-muted-foreground/35 [--xy-background-pattern-color:currentColor]"
            />
            <Controls duration={reducedMotion ? 0 : 200} narrow={narrow} />
            <Panel position="top-center" className="pointer-events-none">
              {/* Always in the DOM, so the polite announcement is picked up when text arrives. */}
              <p
                role="status"
                aria-live="polite"
                className={cn(
                  "max-w-sm rounded-md border border-border bg-card px-3 py-2 text-center text-xs text-foreground shadow-sm",
                  !notice && "sr-only",
                )}
              >
                {notice}
              </p>
            </Panel>
          </ReactFlow>
        </EdgeRoutes.Provider>
      </EdgeActions.Provider>
    </section>
  );
}

const CONTROL =
  "flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:size-11";

function Controls({ duration, narrow }: { duration: number; narrow: boolean }) {
  const c = useI18n().project.canvas;
  const flow = useReactFlow();
  const nodes = useNodes();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const fit = chooseFit(nodes, { width, height }, narrow);
  const fitLabel = fit.mode === "first" ? c.fitFirst : c.fitView;
  return (
    <Panel position="bottom-left">
      <div
        role="group"
        aria-label={c.controls}
        // A column in the left gutter that chooseFit keeps free of cards (fit.ts).
        className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border bg-card shadow-sm"
      >
        <button
          type="button"
          aria-label={c.zoomIn}
          title={c.zoomIn}
          className={CONTROL}
          onClick={() => flow.zoomIn({ duration })}
        >
          <Plus size={15} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={c.zoomOut}
          title={c.zoomOut}
          className={CONTROL}
          onClick={() => flow.zoomOut({ duration })}
        >
          <Minus size={15} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={fitLabel}
          title={fitLabel}
          className={CONTROL}
          onClick={() => void flow.setViewport(fit.viewport, { duration })}
        >
          <Maximize size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </Panel>
  );
}
