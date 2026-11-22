import { useId, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { domainEdgeId } from "./domains";
import { Select } from "./Select";
import { fill } from "./text";
import type { CanvasDomain, CanvasService, ServiceEdge } from "./types";

/**
 * The keyboard and single-pointer way to link services (the canvas drag is the
 * other): pick a service and add, or remove a link from either list. Focus stays
 * put after adding and moves to a neighbour after removing, never to the body.
 * Domains routing here are listed on their own (linked from the domain's sheet).
 */
export function Connections({
  service,
  services,
  edges,
  domains = [],
  onConnect,
  onDisconnect,
}: {
  service: CanvasService;
  services: readonly CanvasService[];
  /** Service → service links (domain links come from `domains`). */
  edges: readonly ServiceEdge[];
  domains?: readonly CanvasDomain[];
  onConnect: (source: string, target: string) => unknown;
  onDisconnect: (id: string) => void;
}) {
  const s = useI18n().project.sheet;
  const d = useI18n().project.domain;
  const headingId = useId();
  const [target, setTarget] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const outgoing = edges.filter((edge) => edge.source === service.id);
  const domainIds = new Set(domains.map((domain) => domain.id));
  const incoming = edges.filter(
    (edge) => edge.target === service.id && !domainIds.has(edge.source),
  );
  const routed = domains.filter((domain) => domain.target === service.id);
  const linked = new Set(outgoing.map((edge) => edge.target));
  const candidates = services.filter((other) => other.id !== service.id && !linked.has(other.id));
  const choice = candidates.some((other) => other.id === target)
    ? target
    : (candidates[0]?.id ?? "");

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choice) return;
    onConnect(service.id, choice);
    setAnnouncement(fill(s.linked, { source: service.id, target: choice }));
    setTarget("");
    // That was the last candidate: picker and Add disable, so move focus to the new link.
    if (candidates.length === 1) {
      const id = `${service.id}->${choice}`;
      requestAnimationFrame(() =>
        listRef.current
          ?.querySelector<HTMLElement>(`button[data-edge="${CSS.escape(id)}"]`)
          ?.focus(),
      );
    }
  }

  function remove(id: string, label: string) {
    // Next remove button, else the previous one, else the picker.
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    const index = buttons.findIndex((button) => button.dataset.edge === id);
    const next = buttons[index + 1] ?? buttons[index - 1];
    onDisconnect(id);
    setAnnouncement(label);
    requestAnimationFrame(() => {
      const focusable = next && next.isConnected ? next : addButtonRef.current;
      focusable?.focus();
    });
  }

  const row = (edge: ServiceEdge, other: string, removed: string, label?: string) => (
    <li key={edge.id} className="flex items-center justify-between gap-3 py-1.5">
      <span className="min-w-0 text-sm text-foreground [overflow-wrap:anywhere]">{other}</span>
      <button
        type="button"
        data-edge={edge.id}
        aria-label={label ?? fill(s.removeLink, { source: edge.source, target: edge.target })}
        onClick={() => remove(edge.id, removed)}
        className="flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:size-10"
      >
        <X size={14} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </li>
  );

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-sm font-medium text-foreground">
        {s.connections}
      </h3>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <form onSubmit={add} className="mt-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{s.addLinkLabel}</label>
          <div className="flex gap-2">
            {candidates.length === 0 ? (
              <span className="flex h-8 flex-1 items-center rounded border border-input px-2 text-[13px] text-muted-foreground coarse:h-10">
                {s.noCandidates}
              </span>
            ) : (
              <div className="min-w-0 flex-1">
                <Select
                  value={choice}
                  options={candidates.map((other) => ({ value: other.id, label: other.name }))}
                  onChange={setTarget}
                  disabled={candidates.length === 0}
                />
              </div>
            )}
            <Button
              ref={addButtonRef}
              type="submit"
              size="sm"
              variant="outline"
              disabled={!choice}
              className="coarse:h-10"
            >
              {s.addLink}
            </Button>
          </div>
        </div>
      </form>

      <div ref={listRef} className="mt-4 space-y-4">
        <div>
          <h4 className="text-xs text-muted-foreground">{s.connectsTo}</h4>
          {outgoing.length ? (
            <ul className="mt-1 divide-y divide-border">
              {outgoing.map((edge) =>
                row(
                  edge,
                  edge.target,
                  fill(s.unlinked, { source: edge.source, target: edge.target }),
                ),
              )}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{s.none}</p>
          )}
        </div>
        <div>
          <h4 className="text-xs text-muted-foreground">{s.usedBy}</h4>
          {incoming.length ? (
            <ul className="mt-1 divide-y divide-border">
              {incoming.map((edge) =>
                row(
                  edge,
                  edge.source,
                  fill(s.unlinked, { source: edge.source, target: edge.target }),
                ),
              )}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{s.none}</p>
          )}
        </div>
        <div>
          <h4 className="text-xs text-muted-foreground">{d.serviceDomains}</h4>
          {routed.length ? (
            <ul className="mt-1 divide-y divide-border">
              {routed.map((domain) =>
                row(
                  {
                    id: domainEdgeId(domain.id, service.id),
                    source: domain.id,
                    target: service.id,
                  },
                  domain.hostname,
                  fill(d.domainUnlinked, { domain: domain.hostname, service: service.id }),
                  fill(d.removeLink, { domain: domain.hostname, service: service.id }),
                ),
              )}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{s.none}</p>
          )}
        </div>
      </div>
    </section>
  );
}
