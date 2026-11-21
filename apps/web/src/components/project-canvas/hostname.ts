/**
 * Display helpers for hostnames. A hostname may only wrap between labels (after a
 * dot), never inside one ("shop-3f9a1c.penelop|e.local" is wrong), so it is rendered
 * as one unbreakable span per label with a <wbr> after each dot.
 */

/** "shop-3f9a1c.penelope.local" → ["shop-3f9a1c.", "penelope.", "local"]. */
export function hostnameLabels(hostname: string): string[] {
  return hostname.split(/(?<=\.)/).filter(Boolean);
}

/**
 * Whether every label fits on one line of `maxChars` (mono text, so characters are a
 * fair width measure). If one doesn't, the caller truncates the whole hostname to a
 * single line with an ellipsis instead of breaking inside the label.
 */
export const labelsFit = (hostname: string, maxChars: number) =>
  hostnameLabels(hostname).every((label) => label.length <= maxChars);
