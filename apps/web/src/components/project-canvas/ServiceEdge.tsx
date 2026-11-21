import { memo, useContext, useMemo, useRef, useState } from "react";
import { EdgeLabelRenderer, useConnection, type Edge, type EdgeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { EdgeActions, EdgeRoutes } from "./edge-actions";
import { midpoint, roundedPath } from "./route";
import { fill } from "./text";

export type ServiceEdgeType = Edge<Record<string, never>, "service">;

/**
 * A link between two services: an orthogonal route around every card (route.ts,
 * computed for the whole graph in ServiceCanvas). Hovering
 * or selecting it shows a remove button at its midpoint; keyboard users remove links
 * from the service sheet's Connections section instead.
 */
export const ServiceEdge = memo(function ServiceEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  markerEnd,
}: EdgeProps<ServiceEdgeType>) {
  const c = useI18n().project.canvas;
  const { remove } = useContext(EdgeActions);
  const routes = useContext(EdgeRoutes);
  const [hovered, setHovered] = useState(false);
  const hideTimer = useRef<number>();

  const routed = routes.get(id);
  const route = useMemo(() => {
    // The routes start and end on the card sides; React Flow's handle points sit a few
    // pixels out (the handle dots). Pin the ends there, keeping the stubs horizontal.
    if (!routed || routed.length < 2) {
      const points = [
        { x: sourceX, y: sourceY },
        { x: targetX, y: targetY },
      ];
      return { path: roundedPath(points), label: midpoint(points) };
    }
    const points = routed.map((point) => ({ ...point }));
    points[0] = { x: sourceX, y: sourceY };
    points[points.length - 1] = { x: targetX, y: targetY };
    if (points.length > 2) {
      points[1]!.y = sourceY;
      points[points.length - 2]!.y = targetY;
    }
    return { path: roundedPath(points), label: midpoint(points) };
  }, [routed, sourceX, sourceY, targetX, targetY]);

  // A short grace period so the pointer can travel from the line to the button.
  const show = () => {
    window.clearTimeout(hideTimer.current);
    setHovered(true);
  };
  const hide = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setHovered(false), 150);
  };

  // While a new link is being dragged across edges, their remove buttons stay hidden.
  const linking = useConnection((connection) => connection.inProgress);
  const active = !linking && (selected || hovered);
  return (
    <>
      <path
        d={route.path}
        fill="none"
        markerEnd={markerEnd}
        className={cn("react-flow__edge-path", active && "[stroke-width:2.25]")}
      />
      {/* Wide invisible stroke: an easy target for hover, click and tap. */}
      <path
        d={route.path}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
        onPointerEnter={show}
        onPointerLeave={hide}
      />
      {active && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute left-0 top-0"
            // Position only (transform), the same inline style React Flow sets on nodes.
            style={{
              transform: `translate(-50%, -50%) translate(${route.label.x}px, ${route.label.y}px)`,
            }}
            onPointerEnter={show}
            onPointerLeave={hide}
          >
            <button
              type="button"
              // Not a tab stop: edges aren't either. The sheet's Connections section is the keyboard path.
              tabIndex={-1}
              aria-label={fill(c.removeLink, { source, target })}
              title={c.removeLinkShort}
              onClick={() => remove(id)}
              className="flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-destructive hover:text-destructive coarse:size-9"
            >
              <X size={12} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
