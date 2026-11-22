import { useCallback, useEffect, useMemo, useState } from "react";
import { domainEdges, domainLinkError, type DomainLinkError } from "./domains";
import { linkError, toEdges, withReferences, type LinkError } from "./graph";
import {
  edgeId,
  loadCanvas,
  saveCanvas,
  type AddedService,
  type Positions,
  type StoredCanvas,
} from "./storage";
import type { CanvasDomain, CanvasService, Point, ServiceEdge } from "./types";

export type GraphLinkError = LinkError | DomainLinkError;

export type DomainChange = Partial<Pick<CanvasDomain, "target" | "port" | "verified">>;

export interface ProjectGraph {
  /** API services plus ones added here, with `references` taken from the current edges. */
  services: CanvasService[];
  /** Domains added here (front-end only). */
  domains: CanvasDomain[];
  /** Service → service links, then domain → service links. */
  edges: ServiceEdge[];
  /** Saved card positions (canvas only). */
  positions: Positions;
  addService: (service: AddedService, position?: Point) => void;
  addDomain: (domain: CanvasDomain, position?: Point) => void;
  /** Change a domain's target, port or (mock) DNS state. */
  updateDomain: (id: string, change: DomainChange) => void;
  /**
   * Links two nodes. A domain that already routes elsewhere is re-pointed (the
   * caller announces the replacement; see domainLinkError).
   */
  connect: (source: string, target: string) => GraphLinkError | null;
  disconnect: (id: string) => void;
  savePositions: (positions: Positions) => void;
  /** Remove a locally-added service and clean up its edges and domain targets. */
  removeService: (id: string) => void;
  /** Remove a domain. */
  removeDomain: (id: string) => void;
  /** Rename a locally-added service (id equals its name in storage). */
  renameService: (oldId: string, newName: string) => void;
}

const toCanvasService = (service: AddedService): CanvasService => ({
  ...service,
  status: null,
  deployedAt: null,
  references: [],
});

/**
 * The editable graph for one project: front-end state persisted to localStorage
 * (no API yet). `base` is what the API (and dev fixtures) returned; null while loading.
 */
export function useProjectGraph(
  projectId: string,
  base: CanvasService[] | null,
): ProjectGraph | null {
  const [stored, setStored] = useState<StoredCanvas | null>(null);

  useEffect(() => {
    setStored(
      base
        ? loadCanvas(
            projectId,
            base.map((service) => service.id),
          )
        : null,
    );
  }, [projectId, base]);

  const update = useCallback(
    (change: (current: StoredCanvas) => StoredCanvas) =>
      setStored((current) => {
        if (!current) return current;
        const next = change(current);
        saveCanvas(projectId, next);
        return next;
      }),
    [projectId],
  );

  const defaultEdges = useMemo(() => (base ? toEdges(base) : []), [base]);
  const serviceEdges = stored?.edges ?? defaultEdges;
  const domains = useMemo(() => stored?.domains ?? [], [stored]);
  const edges = useMemo(() => [...serviceEdges, ...domainEdges(domains)], [serviceEdges, domains]);
  const services = useMemo(
    () =>
      base && stored
        ? withReferences([...base, ...stored.services.map(toCanvasService)], serviceEdges)
        : null,
    [base, stored, serviceEdges],
  );

  const ids = useMemo(() => new Set(services?.map((service) => service.id)), [services]);

  const updateDomain = useCallback<ProjectGraph["updateDomain"]>(
    (id, change) =>
      update((current) => ({
        ...current,
        domains: current.domains.map((domain) =>
          domain.id === id ? { ...domain, ...change } : domain,
        ),
      })),
    [update],
  );

  const connect = useCallback(
    (source: string, target: string): GraphLinkError | null => {
      const domainError = domainLinkError(domains, ids, source, target);
      if (domainError) return domainError;
      if (domains.some((domain) => domain.id === source)) {
        updateDomain(source, { target });
        return null;
      }
      const error = linkError(serviceEdges, ids, source, target);
      if (error) return error;
      update((current) => ({
        ...current,
        edges: [...(current.edges ?? defaultEdges), { id: edgeId(source, target), source, target }],
      }));
      return null;
    },
    [domains, serviceEdges, ids, update, defaultEdges, updateDomain],
  );

  const disconnect = useCallback(
    (id: string) =>
      update((current) => {
        const domain = current.domains.find(
          (item) => item.target && `${item.id}->${item.target}` === id,
        );
        if (domain) {
          return {
            ...current,
            domains: current.domains.map((item) =>
              item === domain ? { ...item, target: null } : item,
            ),
          };
        }
        return {
          ...current,
          edges: (current.edges ?? defaultEdges).filter((edge) => edge.id !== id),
        };
      }),
    [update, defaultEdges],
  );

  const addDomain = useCallback(
    (domain: CanvasDomain, position?: Point) =>
      update((current) => ({
        ...current,
        domains: [...current.domains, domain],
        positions: position ? { ...current.positions, [domain.id]: position } : current.positions,
      })),
    [update],
  );

  const addService = useCallback(
    (service: AddedService, position?: Point) =>
      update((current) => ({
        ...current,
        services: [...current.services, service],
        positions: position ? { ...current.positions, [service.id]: position } : current.positions,
      })),
    [update],
  );

  const savePositions = useCallback(
    (positions: Positions) => update((current) => ({ ...current, positions })),
    [update],
  );

  const removeService = useCallback(
    (id: string) =>
      update((current) => {
        const edges = (current.edges ?? defaultEdges).filter(
          (edge) => edge.source !== id && edge.target !== id,
        );
        const domains = current.domains.map((domain) =>
          domain.target === id ? { ...domain, target: null } : domain,
        );
        const services = current.services.filter((service) => service.id !== id);
        const positions = Object.fromEntries(
          Object.entries(current.positions).filter(([k]) => k !== id),
        );
        return { ...current, services, edges, domains, positions };
      }),
    [update, defaultEdges],
  );

  const removeDomain = useCallback(
    (id: string) =>
      update((current) => {
        const positions = Object.fromEntries(
          Object.entries(current.positions).filter(([k]) => k !== id),
        );
        return {
          ...current,
          domains: current.domains.filter((domain) => domain.id !== id),
          edges: (current.edges ?? defaultEdges).filter(
            (edge) => edge.source !== id && edge.target !== id,
          ),
          positions,
        };
      }),
    [update, defaultEdges],
  );

  const renameService = useCallback(
    (oldId: string, newName: string) =>
      update((current) => {
        const services = current.services.map((service) =>
          service.id === oldId ? { ...service, id: newName, name: newName } : service,
        );
        const edges = (current.edges ?? defaultEdges).map((edge) => ({
          ...edge,
          id: edgeId(
            edge.source === oldId ? newName : edge.source,
            edge.target === oldId ? newName : edge.target,
          ),
          source: edge.source === oldId ? newName : edge.source,
          target: edge.target === oldId ? newName : edge.target,
        }));
        const domains = current.domains.map((domain) =>
          domain.target === oldId ? { ...domain, target: newName } : domain,
        );
        const { [oldId]: pos, ...rest } = current.positions;
        const positions = pos !== undefined ? { ...rest, [newName]: pos } : rest;
        return { ...current, services, edges, domains, positions };
      }),
    [update, defaultEdges],
  );

  if (!services || !stored) return null;
  return {
    services,
    domains,
    edges,
    positions: stored.positions,
    addService,
    addDomain,
    updateDomain,
    connect,
    disconnect,
    savePositions,
    removeService,
    removeDomain,
    renameService,
  };
}
