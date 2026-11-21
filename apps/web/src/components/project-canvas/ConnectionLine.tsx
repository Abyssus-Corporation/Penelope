import { useMemo } from "react";
import { useNodes, type ConnectionLineComponentProps } from "@xyflow/react";
import { roundedPath, routeOrthogonal, targetHandle } from "./route";
import { cardBoxes } from "./use-edge-routes";

/**
 * The line drawn while a link is being dragged: routed like a finished edge, around
 * every card (from the current card rectangles), into the target's handle once the
 * pointer is over a card that accepts the link.
 */
export function ConnectionLine({ fromX, fromY, toX, toY, toNode }: ConnectionLineComponentProps) {
  const nodes = useNodes();
  const boxes = useMemo(() => cardBoxes(nodes), [nodes]);
  const path = useMemo(() => {
    const all = [...boxes.values()];
    const target = toNode ? boxes.get(toNode.id) : undefined;
    // A free pointer: the line ends at it; skip the card under it, if any.
    const obstacles = target
      ? all
      : all.filter(
          (box) =>
            !(toX > box.x && toX < box.x + box.width && toY > box.y && toY < box.y + box.height),
        );
    const end = target ? targetHandle(target) : { x: toX, y: toY };
    const route = routeOrthogonal({ x: fromX, y: fromY }, end, obstacles, {
      startStub: true,
      endStub: Boolean(target),
    });
    return roundedPath(route.points);
  }, [boxes, fromX, fromY, toX, toY, toNode]);
  return <path d={path} fill="none" className="react-flow__connection-path" />;
}
