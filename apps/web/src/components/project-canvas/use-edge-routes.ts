import { useMemo, useRef } from "react";
import type { Node } from "@xyflow/react";
import { DEFAULT_NODE_HEIGHT, NODE_WIDTH, type Box } from "./graph";
import { routeAll, type RouteCache } from "./route";
import type { Point } from "./types";

/** Card rectangles in flow coordinates (measured size once React Flow has it). */
export function cardBoxes(nodes: readonly Node[]): Map<string, Box> {
  const boxes = new Map<string, Box>();
  for (const node of nodes) {
    boxes.set(node.id, {
      x: node.position.x,
      y: node.position.y,
      width: node.measured?.width ?? NODE_WIDTH,
      height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
    });
  }
  return boxes;
}

/**
 * Routes for every edge, recomputed only when a card rectangle or the edge list
 * changes (a selection or a re-render with the same geometry reuses them), and per
 * edge only when a card near it moved (route.ts cache).
 */
export function useEdgeRoutes(
  nodes: readonly Node[],
  edges: readonly { id: string; source: string; target: string }[],
) {
  const cache = useRef<RouteCache>(new Map());
  const boxes = useMemo(() => cardBoxes(nodes), [nodes]);
  const hash = useMemo(() => {
    let key = "";
    for (const [id, box] of boxes) {
      key += `${id}:${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)};`;
    }
    key += "|";
    for (const edge of edges) key += `${edge.id};`;
    return key;
  }, [boxes, edges]);
  // Keyed by `hash`: same geometry and links, same routes (a selection doesn't re-route).
  const last = useRef<{ hash: string; routes: Map<string, Point[]> } | null>(null);
  if (last.current?.hash !== hash) {
    last.current = { hash, routes: routeAll(edges, boxes, cache.current).routes };
  }
  return last.current.routes;
}
