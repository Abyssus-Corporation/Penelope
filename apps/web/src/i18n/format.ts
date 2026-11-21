// Intl constructors are slow (~0.1ms each), so build each formatter once per locale.
const cache = new Map<string, unknown>();
function cached<T>(key: string, create: () => T): T {
  if (!cache.has(key)) cache.set(key, create());
  return cache.get(key) as T;
}

export type PluralForms = { readonly one: string; readonly other: string };

/** Picks the plural form for `count` and fills `{n}` with the locale-formatted count. */
export function plural(locale: string, forms: PluralForms, count: number): string {
  const rule = cached(`plural:${locale}`, () => new Intl.PluralRules(locale)).select(count);
  const form = rule === "one" ? forms.one : forms.other;
  return form.replace("{n}", formatNumber(locale, count));
}

export function formatNumber(locale: string, value: number): string {
  return cached(`number:${locale}`, () => new Intl.NumberFormat(locale)).format(value);
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/**
 * Formats an ISO 8601 timestamp as a short relative time ("4m ago") plus a full
 * absolute date for a `title`. Returns null when the value is not a valid date.
 */
export function formatRelativeTime(
  locale: string,
  iso: string,
  justNow: string,
  now: number = Date.now(),
): { relative: string; absolute: string } | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;

  const absolute = cached(
    `date:${locale}`,
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
  ).format(time);
  const seconds = Math.round((time - now) / 1000);
  const unit = RELATIVE_UNITS.find(([, size]) => Math.abs(seconds) >= size);
  if (!unit) return { relative: justNow, absolute };

  const rtf = cached(
    `relative:${locale}`,
    () => new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "narrow" }),
  );
  return { relative: rtf.format(Math.trunc(seconds / unit[1]), unit[0]), absolute };
}
