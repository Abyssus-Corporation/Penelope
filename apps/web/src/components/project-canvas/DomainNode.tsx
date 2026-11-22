import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { useCanvasActions } from "./canvas-actions";
import { DnsStatusBadge, DomainIcon, Hostname } from "./domain-parts";
import { fill } from "./text";
import type { CanvasDomain } from "./types";

export type DomainNodeType = Node<{ domain: CanvasDomain }, "domain">;

const ACTION_BTN = cn(
  "flex size-7 items-center justify-center rounded transition-colors coarse:size-9",
  "text-muted-foreground/70 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

/**
 * A domain card: smaller than a service card, one source handle on the right and no
 * target handle, so nothing can be linked into a domain. Drag from its dot onto a
 * service to route the domain there (it replaces any previous target).
 */
export const DomainNode = memo(function DomainNode({
  id,
  data,
  selected,
}: NodeProps<DomainNodeType>) {
  const { domain } = data;
  const d = useI18n().project.domain;
  const c = useI18n().project.canvas;
  const actions = useCanvasActions();

  return (
    <div
      className={cn(
        "relative w-52 rounded-lg border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-150",
        "group-hover:border-muted-foreground/50",
        "ring-offset-2 ring-offset-background group-focus-visible:ring-2 group-focus-visible:ring-ring",
        selected ? "border-foreground/60" : "border-border",
      )}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <DomainIcon />
          {/* ~148px of 12px mono: 20 characters per line. */}
          <Hostname
            hostname={domain.hostname}
            maxLabel={20}
            className="min-w-0 flex-1 pt-1 font-mono text-[12px] leading-4 text-foreground"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <DnsStatusBadge domain={domain} />
          <span className="text-[11px] text-muted-foreground">
            {domain.type === "generated" ? d.generated : d.custom}
          </span>
        </div>
      </div>

      {/* Remove action — always local; fades in on hover */}
      {actions && (
        <div
          className={cn(
            "flex items-center justify-end border-t border-border px-1.5 py-1",
            "opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100",
            selected && "opacity-100",
          )}
        >
          <button
            type="button"
            aria-label={c.removeDomain}
            title={c.removeDomain}
            className={ACTION_BTN}
            onClick={(event) => {
              event.stopPropagation();
              actions.onRemoveDomain(id);
            }}
          >
            <Trash2 size={12} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}

      <span className="sr-only">
        , {d.role}, {domain.target ? fill(d.routesTo, { service: domain.target }) : d.unlinked}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!size-3 !border-2 !border-card !bg-muted-foreground hover:!bg-foreground",
          "after:absolute after:-inset-2 after:content-['']",
          "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-[.selected]:opacity-100 coarse:!size-4 coarse:opacity-100",
          "[&.connectingfrom]:opacity-100",
        )}
      />
    </div>
  );
});
