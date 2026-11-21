/**
 * cubic-bezier() as a JS easing for animations React Flow state has to follow
 * frame by frame (node positions), solved with Newton's method like the CSS one.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const curve = (a: number, b: number, t: number) =>
    3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;
  const slope = (a: number, b: number, t: number) =>
    3 * a * (1 - t) * (1 - t) + 6 * (b - a) * (1 - t) * t + 3 * (1 - b) * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t -= (curve(x1, x2, t) - x) / d;
    }
    return curve(y1, y2, Math.min(1, Math.max(0, t)));
  };
}

/** Strong ease-in-out for on-screen movement (cards sliding to their arranged spot). */
export const easeInOut = cubicBezier(0.77, 0, 0.175, 1);
export const ARRANGE_MS = 250;
