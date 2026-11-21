/**
 * Fills `{key}` placeholders. Replacer functions, so a service name containing `$&`
 * or `$1` is inserted literally (String.replace would expand those patterns).
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}
