import type { Viewport } from "@xyflow/react";
import { DEFAULT_NODE_HEIGHT, NODE_WIDTH } from "./graph";
import type { Point } from "./types";

/** Below 768px a fit never shrinks cards past this, so their text stays readable. */
export const NARROW_MIN_ZOOM = 0.75;
/** Wider screens: below this a fit-all is unreadable, so show the first column instead. */
export const WIDE_MIN_ZOOM = 0.5;

type Padding = { top: number; right: number; bottom: number; left: number };
// The zoom controls are a column at the bottom-left; the first column of cards starts
// right of that gutter (72px), so no framed card, nor the rest of its column below the
// fold, ever sits under them. At 320px this also caps the zoom at exactly 0.75.
export const NARROW_PADDING: Padding = { top: 16, right: 8, bottom: 16, left: 72 };
export const WIDE_PADDING: Padding = { top: 32, right: 32, bottom: 40, left: 72 };

type FitNode = { id: string; position: Point; measured?: { width?: number; height?: number } };
type Size = { width: number; height: number };

export type FitMode = "all" | "first";

function bounds(nodes: readonly FitNode[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + (node.measured?.width ?? NODE_WIDTH));
    maxY = Math.max(maxY, node.position.y + (node.measured?.height ?? DEFAULT_NODE_HEIGHT));
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

const zoomToFit = (box: ReturnType<typeof bounds>, size: Size, padding: Padding) =>
  Math.min(
    (size.width - padding.left - padding.right) / box.width,
    (size.height - padding.top - padding.bottom) / box.height,
  );

/** The cards in the left-most column (where traffic enters: web, gateways), top first. */
function firstColumn(nodes: readonly FitNode[], limit: number) {
  const minX = Math.min(...nodes.map((node) => node.position.x));
  return nodes
    .filter((node) => node.position.x < minX + NODE_WIDTH / 2)
    .sort((a, b) => a.position.y - b.position.y)
    .slice(0, limit);
}

/**
 * How the canvas frames its cards in a viewport of `size`:
 * - below 768px, the first two cards of the first column at zoom ≥ 0.75;
 * - otherwise everything, centred, unless that needs a zoom under 0.5 (60+ services
 *   on a laptop); then the first column at zoom ≥ 0.5, pinned top-left so the rest
 *   of the graph continues to the right. Pan or zoom out to see it.
 */
export function chooseFit(
  nodes: readonly FitNode[],
  size: Size,
  narrow: boolean,
): { mode: FitMode; viewport: Viewport } {
  if (nodes.length === 0 || size.width <= 0 || size.height <= 0) {
    return { mode: "all", viewport: { x: 0, y: 0, zoom: 1 } };
  }
  const padding = narrow ? NARROW_PADDING : WIDE_PADDING;
  if (!narrow) {
    const box = bounds(nodes);
    const zoom = Math.min(1, zoomToFit(box, size, padding));
    if (zoom >= WIDE_MIN_ZOOM) {
      const innerWidth = size.width - padding.left - padding.right;
      const innerHeight = size.height - padding.top - padding.bottom;
      return {
        mode: "all",
        viewport: {
          x: padding.left + (innerWidth - box.width * zoom) / 2 - box.minX * zoom,
          y: padding.top + (innerHeight - box.height * zoom) / 2 - box.minY * zoom,
          zoom,
        },
      };
    }
  }
  const minZoom = narrow ? NARROW_MIN_ZOOM : WIDE_MIN_ZOOM;
  const box = bounds(firstColumn(nodes, narrow ? 2 : 6));
  const zoom = Math.min(1, Math.max(minZoom, zoomToFit(box, size, padding)));
  return {
    mode: "first",
    viewport: { x: padding.left - box.minX * zoom, y: padding.top - box.minY * zoom, zoom },
  };
}
