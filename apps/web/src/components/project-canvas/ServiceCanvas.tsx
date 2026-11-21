import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type OnNodesChange,
  type NodeMouseHandler,
} from "@xyflow/react";
// Same-origin stylesheet: Vite emits it as a hashed /assets/*.css file linked by
// this lazy chunk. React Flow itself only sets inline style attributes
// (transforms), which style-src allows; it never injects <style> elements.
import "@xyflow/react/dist/base.css";
import { Maximize, Minus, Plus } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { WIDE_FIT, narrowFitOptions } from "./fit";
import { layoutServices, toEdges } from "./graph";
import { NARROW_QUERY, useMediaQuery, useReducedMotion } from "./hooks";
import { loadPositions, savePositions, type Positions } from "./positions";
import { ServiceNode, type ServiceNodeType } from "./ServiceNode";
import type { CanvasService } from "./types";

const nodeTypes = { service: ServiceNode };
// A string: React Flow 13 reads a bare number as pixels, not a fraction.

export interface ServiceCanvasProps {
  projectId: string;
  services: CanvasService[];
  onOpen: (serviceId: string) => void;
}

export default function ServiceCanvas(props: ServiceCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

function Canvas({ projectId, services, onOpen }: ServiceCanvasProps) {
  const c = useI18n().project.canvas;
  const instructionsId = useId();
  const reducedMotion = useReducedMotion();
  const narrow = useMediaQuery(NARROW_QUERY);

  const [nodes, setNodes] = useState<ServiceNodeType[]>(() => {
    const layout = layoutServices(services);
    const saved = loadPositions(
      projectId,
      services.map((service) => service.id),
    );
    return services.map((service) => ({
      id: service.id,
      type: "service",
      position: saved[service.id] ?? layout[service.id] ?? { x: 0, y: 0 },
      data: { service },
      className: "group rounded-lg outline-none",
      ariaRole: "button",
      domAttributes: { "aria-haspopup": "dialog" },
    }));
  });

  // Only the first fit uses this; later fits come from the controls.
  const [initialFit] = useState(() => (narrow ? narrowFitOptions(nodes) : WIDE_FIT));

  const edges = useMemo<Edge[]>(
    () =>
      toEdges(services).map((edge) => ({
        ...edge,
        focusable: false,
        selectable: false,
        className: "text-muted-foreground/70",
        // null: the arrow takes --xy-edge-stroke, i.e. the token colour above.
        markerEnd: { type: MarkerType.ArrowClosed, color: null, width: 16, height: 16 },
      })),
    [services],
  );

  // Persist once a move settles (drag end or an arrow-key step), never mid-drag.
  const settled = useRef(false);
  const onNodesChange = useCallback<OnNodesChange<ServiceNodeType>>((changes) => {
    if (changes.getByType("position").some((change) => !change.dragging)) {
      settled.current = true;
    }
    setNodes((current) => changes.applyTo(current));
  }, []);
  useEffect(() => {
    if (!settled.current) return;
    settled.current = false;
    const positions: Positions = Object.create(null);
    for (const node of nodes) positions[node.id] = node.position;
    savePositions(projectId, positions);
  }, [nodes, projectId]);

  const onNodeClick = useCallback<NodeMouseHandler<ServiceNodeType>>(
    (_, node) => onOpen(node.id),
    [onOpen],
  );

  // React Flow uses Enter/Space to select the focused node; Enter also opens it.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" || event.repeat) return;
    const target = event.target as HTMLElement;
    if (!target.classList.contains("react-flow__node")) return;
    const id = target.getAttribute("data-id");
    if (!id) return;
    // Without this, the same Enter press activates whatever button the sheet
    // focuses on open (its close button) and the sheet shuts straight away.
    event.preventDefault();
    onOpen(id);
  };

  return (
    <section
      aria-label={c.regionLabel}
      aria-describedby={instructionsId}
      onKeyDown={onKeyDown}
      className={cn(
        "relative h-full w-full",
        // React Flow reads these variables; point them at our tokens via currentColor.
        "[--xy-background-color:transparent] [--xy-edge-stroke-width:1.5] [--xy-edge-stroke:currentColor]",
      )}
    >
      <p id={instructionsId} className="sr-only">
        {c.instructions}
      </p>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        nodesConnectable={false}
        edgesFocusable={false}
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={2}
        fitView
        fitViewOptions={initialFit}
        proOptions={{ hideAttribution: true }}
        ariaLabelConfig={{
          "node.a11yDescription.default": c.nodeDescription,
          "node.a11yDescription.keyboardDisabled": c.nodeDescription,
          "node.a11yDescription.ariaLiveMessage": ({ direction, x, y }) =>
            c.nodeMoved
              .replace("{direction}", direction)
              .replace("{x}", String(x))
              .replace("{y}", String(y)),
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
      </ReactFlow>
    </section>
  );
}

const CONTROL =
  "flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:size-11";

function Controls({ duration, narrow }: { duration: number; narrow: boolean }) {
  const c = useI18n().project.canvas;
  const flow = useReactFlow();
  return (
    <Panel position="bottom-left">
      <div
        role="group"
        aria-label={c.controls}
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
          aria-label={narrow ? c.fitFirst : c.fitView}
          title={narrow ? c.fitFirst : c.fitView}
          className={CONTROL}
          onClick={() =>
            flow.fitView({ ...(narrow ? narrowFitOptions(flow.getNodes()) : WIDE_FIT), duration })
          }
        >
          <Maximize size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </Panel>
  );
}
