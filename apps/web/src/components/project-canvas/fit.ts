import type { FitViewOptions } from "@xyflow/react";
import { NODE_WIDTH } from "./graph";

export const FIT_PADDING = "8%";
/** Below 768px a fit never shrinks cards past this, so their text stays readable. */
export const NARROW_MIN_ZOOM = 0.75;

/**
 * Narrow screens: rather than shrinking every service to fit, centre the first
 * column (where traffic enters: web, gateways) at a readable zoom. Pan or pinch
 * to see the rest.
 */
export function narrowFitOptions(
  nodes: readonly { id: string; position: { x: number; y: number } }[],
): FitViewOptions {
  const minX = Math.min(...nodes.map((node) => node.position.x));
  const first = nodes
    .filter((node) => node.position.x < minX + NODE_WIDTH / 2)
    .sort((a, b) => a.position.y - b.position.y)
    .slice(0, 2);
  return {
    nodes: first.map(({ id }) => ({ id })),
    padding: FIT_PADDING,
    minZoom: NARROW_MIN_ZOOM,
    maxZoom: 1,
  };
}

export const WIDE_FIT: FitViewOptions = { padding: FIT_PADDING, maxZoom: 1 };
