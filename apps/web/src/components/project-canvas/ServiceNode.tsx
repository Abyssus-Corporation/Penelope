import { memo } from "react";
import { Handle, Position, useConnection, type Node, type NodeProps } from "@xyflow/react";
import { Pencil, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useCanvasActions } from "./canvas-actions";
import { KindIcon, LastDeploy, ServiceSourceLine, ServiceStatusLabel } from "./service-parts";
import type { CanvasService } from "./types";

export type ServiceNodeType = Node<{ service: CanvasService }, "service">;

const ACTION_BTN = cn(
  "flex size-7 items-center justify-center rounded transition-colors coarse:size-9",
  "text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

/**
 * Service card on the canvas. The focusable element is React Flow's node
 * wrapper (it carries the role, aria-label and tabindex), so the ring here is
 * drawn from the wrapper's `group` focus state.
 *
 * Linking: drag from the dot on the right edge onto another card. While a link is
 * being dragged, every other card is one big drop target (the target handle grows
 * to cover it), so the drop doesn't need to hit a 12px dot.
 */
export const ServiceNode = memo(function ServiceNode({
  id,
  data,
  selected,
}: NodeProps<ServiceNodeType>) {
  const { service } = data;
  const c = useI18n().project.canvas;
  const actions = useCanvasActions();
  const isLocal = service.status === null;

  const dropTarget = useConnection((connection) =>
    Boolean(connection.inProgress && connection.fromNode.id !== id),
  );

  return (
    <div
      className={cn(
        "relative w-60 rounded-lg border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-150",
        "group-hover:border-muted-foreground/50",
        "ring-offset-2 ring-offset-background group-focus-visible:ring-2 group-focus-visible:ring-ring",
        selected
          ? "border-foreground/60"
          : service.status === "failed"
            ? "border-destructive/40 group-hover:border-destructive/60"
            : "border-border",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectableStart={false}
        className={cn(
          "!border-0 !bg-transparent",
          dropTarget
            ? "!inset-0 !h-full !w-full !transform-none !rounded-lg [&.connectingto.valid]:ring-2 [&.connectingto.valid]:ring-ring"
            : "invisible",
        )}
      />

      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <KindIcon kind={service.kind} />
          <div className="min-w-0 flex-1">
            {/* Two lines at most so card heights stay bounded; the text stays in the DOM, so
                the accessible name is complete, and `title` shows it on hover. */}
            <p
              title={service.name}
              className="line-clamp-2 text-sm font-medium leading-5 text-foreground [overflow-wrap:anywhere]"
            >
              {service.name}
            </p>
            <div className="mt-0.5">
              <ServiceSourceLine service={service} clamp />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-2.5">
          <ServiceStatusLabel service={service} />
          <LastDeploy service={service} />
        </div>
      </div>

      {/* Action bar — only for locally-added services; fades in on card hover */}
      {isLocal && actions && (
        <div
          className={cn(
            "flex items-center justify-end gap-0.5 border-t border-border px-1.5 py-1",
            "opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100",
            selected && "opacity-100",
          )}
        >
          <button
            type="button"
            aria-label={c.renameService}
            title={c.renameService}
            className={ACTION_BTN}
            onClick={(event) => {
              event.stopPropagation();
              actions.onRenameService(id, service.name);
            }}
          >
            <Pencil size={12} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={c.removeService}
            title={c.removeService}
            className={cn(ACTION_BTN, "hover:text-destructive")}
            onClick={(event) => {
              event.stopPropagation();
              actions.onRemoveService(id);
            }}
          >
            <Trash2 size={12} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* The node's accessible name is its text, so it always matches what's visible
          (WCAG 2.5.3); this adds what only the card's icon and edges show. */}
      <span className="sr-only">
        , {c.kinds[service.kind]},{" "}
        {service.references.length
          ? `${c.references} ${service.references.join(", ")}`
          : c.referencesNone}
      </span>
      {/* Dragging is one way to link; the sheet's Connections section is the
          single-pointer and keyboard way (WCAG 2.5.7), so the dot can stay small. */}
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!size-3 !border-2 !border-card !bg-muted-foreground hover:!bg-foreground",
          "after:absolute after:-inset-2 after:content-['']",
          "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-[.selected]:opacity-100 coarse:!size-4 coarse:opacity-100",
          "[&.connectingfrom]:opacity-100",
          dropTarget && "!opacity-0",
        )}
      />
    </div>
  );
});
