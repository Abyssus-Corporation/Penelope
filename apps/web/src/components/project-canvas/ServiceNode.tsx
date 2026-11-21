import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { KindIcon, LastDeploy, ServiceSourceLine, ServiceStatusLabel } from "./service-parts";
import type { CanvasService } from "./types";

export type ServiceNodeType = Node<{ service: CanvasService }, "service">;

/**
 * Service card on the canvas. The focusable element is React Flow's node
 * wrapper (it carries the role, aria-label and tabindex), so the ring here is
 * drawn from the wrapper's `group` focus state.
 */
export const ServiceNode = memo(function ServiceNode({
  data,
  selected,
}: NodeProps<ServiceNodeType>) {
  const { service } = data;
  const c = useI18n().project.canvas;
  return (
    <div
      className={cn(
        "w-60 rounded-lg border bg-card p-3 text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-150",
        "group-hover:border-muted-foreground/50",
        "ring-offset-2 ring-offset-background group-focus-visible:ring-2 group-focus-visible:ring-ring",
        selected ? "border-foreground/60" : "border-border",
      )}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="invisible" />
      <div className="flex items-start gap-2.5">
        <KindIcon kind={service.kind} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-5 text-foreground [overflow-wrap:anywhere]">
            {service.name}
          </p>
          <div className="mt-0.5">
            <ServiceSourceLine service={service} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-2.5">
        <ServiceStatusLabel service={service} />
        <LastDeploy service={service} />
      </div>
      {/* The node's accessible name is its text, so it always matches what's visible
          (WCAG 2.5.3); this adds what only the card's icon and edges show. */}
      <span className="sr-only">
        , {c.kinds[service.kind]},{" "}
        {service.references.length
          ? `${c.references} ${service.references.join(", ")}`
          : c.referencesNone}
      </span>
      <Handle type="source" position={Position.Right} isConnectable={false} className="invisible" />
    </div>
  );
});
