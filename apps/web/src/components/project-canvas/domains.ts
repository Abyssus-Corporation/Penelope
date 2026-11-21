import type { CanvasDomain, ServiceEdge } from "./types";

/** Suffix of generated (mock) domains. `.local` is never publicly resolvable. */
export const GENERATED_SUFFIX = "penelope.local";
export const HOSTNAME_MAX_LENGTH = 253;
export const LABEL_MAX_LENGTH = 63;
export const DEFAULT_PORT = 8080;
/** Placeholder platform targets (RFC 5737 / RFC 3849 documentation ranges, and .local). */
export const PLATFORM_CNAME = `cname.${GENERATED_SUFFIX}`;
export const PLATFORM_A = "192.0.2.10";
export const PLATFORM_AAAA = "2001:db8::10";

const LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export type LabelError = "required" | "tooLong" | "invalid";

/** One DNS label (RFC 1123): 1-63 of a-z, 0-9 and "-", not starting or ending with "-". */
export function validateLabel(raw: string): LabelError | null {
  const label = raw.trim();
  if (!label) return "required";
  if (label.length > LABEL_MAX_LENGTH) return "tooLong";
  return LABEL.test(label) ? null : "invalid";
}

export type HostnameError =
  | "required"
  | "scheme"
  | "pathOrPort"
  | "invalid"
  | "tooLong"
  | "labelTooLong"
  | "noDot"
  | "ip"
  | "reserved"
  | "taken";

/**
 * Normalizes what the user typed into a hostname: trimmed, lowercased, IDN labels
 * turned into punycode (via the URL parser's hostname normalization, so "café.fr"
 * becomes "xn--caf-dma.fr"), one trailing dot dropped. Rejects schemes, paths, ports,
 * IP addresses and anything that isn't RFC 1123 labels joined by dots.
 */
export function normalizeHostname(
  raw: string,
  existing: readonly string[] = [],
): { hostname: string; error: HostnameError | null } {
  const input = raw.trim();
  if (!input) return { hostname: "", error: "required" };
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) return { hostname: "", error: "scheme" };
  if (/[/?#:@\\]/.test(input)) return { hostname: "", error: "pathOrPort" };
  if (/\s/.test(input)) return { hostname: "", error: "invalid" };
  let hostname: string;
  try {
    hostname = new URL(`http://${input}`).hostname;
  } catch {
    return { hostname: "", error: "invalid" };
  }
  if (hostname.endsWith(".")) hostname = hostname.slice(0, -1);
  if (!hostname) return { hostname, error: "invalid" };
  // The URL parser turns "1.2.3.4" (and "0x7f.1") into an IPv4 address; IPv6 has brackets.
  if (/^[\d.]+$/.test(hostname) || hostname.startsWith("[")) return { hostname, error: "ip" };
  if (hostname.length > HOSTNAME_MAX_LENGTH) return { hostname, error: "tooLong" };
  const labels = hostname.split(".");
  if (labels.length < 2) return { hostname, error: "noDot" };
  if (labels.some((label) => label.length > LABEL_MAX_LENGTH)) {
    return { hostname, error: "labelTooLong" };
  }
  if (labels.some((label) => !LABEL.test(label))) return { hostname, error: "invalid" };
  if (/^\d+$/.test(labels[labels.length - 1]!)) return { hostname, error: "invalid" };
  if (hostname === GENERATED_SUFFIX || hostname.endsWith(`.${GENERATED_SUFFIX}`)) {
    return { hostname, error: "reserved" };
  }
  if (existing.includes(hostname)) return { hostname, error: "taken" };
  return { hostname, error: null };
}

/**
 * Suffixes where the registrable domain has three labels (example.co.uk). A small,
 * hand-picked list: this is a heuristic for the DNS helper, not the Public Suffix List,
 * so an unusual suffix may be shown as a subdomain (CNAME) when it's really an apex.
 */
const MULTI_PART_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.br",
  "net.br",
  "org.br",
  "com.au",
  "net.au",
  "org.au",
  "co.jp",
  "co.nz",
  "co.za",
  "com.mx",
  "com.ar",
  "com.tr",
  "co.in",
]);

/** The registrable part ("example.co.uk") and what's left of it ("app.eu" or ""). */
export function splitHostname(hostname: string): { apex: string; sub: string } {
  const labels = hostname.split(".");
  const size = MULTI_PART_SUFFIXES.has(labels.slice(-2).join(".")) ? 3 : 2;
  return {
    apex: labels.slice(-size).join("."),
    sub: labels.slice(0, Math.max(0, labels.length - size)).join("."),
  };
}

/** Heuristic (see MULTI_PART_SUFFIXES): an apex can't be a CNAME, so it gets A + AAAA. */
export const isApex = (hostname: string) => splitHostname(hostname).sub === "";

export interface DnsRecord {
  type: "A" | "AAAA" | "CNAME";
  /** As most DNS providers ask for it: "@" for the apex, else the part before it. */
  host: string;
  value: string;
}

/** What to set at the user's DNS provider (placeholder platform values for now). */
export function dnsRecords(hostname: string): DnsRecord[] {
  const { sub } = splitHostname(hostname);
  if (!sub) {
    return [
      { type: "A", host: "@", value: PLATFORM_A },
      { type: "AAAA", host: "@", value: PLATFORM_AAAA },
    ];
  }
  return [{ type: "CNAME", host: sub, value: PLATFORM_CNAME }];
}

/** A generated label: "<service>-<6 hex>", cut so the label stays ≤ 63 characters. */
export function generateLabel(service: string, random: () => number = Math.random): string {
  const hash = Array.from({ length: 6 }, () => Math.floor(random() * 16).toString(16)).join("");
  const base = (service || "app").slice(0, LABEL_MAX_LENGTH - hash.length - 1).replace(/-+$/, "");
  return `${base}-${hash}`;
}

export const generatedHostname = (label: string) => `${label.trim()}.${GENERATED_SUFFIX}`;

export type PortError = "required" | "invalid";

export function validatePort(raw: string): PortError | null {
  const value = raw.trim();
  if (!value) return "required";
  if (!/^\d{1,5}$/.test(value)) return "invalid";
  const port = Number(value);
  return port >= 1 && port <= 65535 ? null : "invalid";
}

export const domainEdgeId = (domain: string, target: string) => `${domain}->${target}`;

/** The link each domain draws to its target service. */
export function domainEdges(domains: readonly CanvasDomain[]): ServiceEdge[] {
  return domains.flatMap((domain) =>
    domain.target
      ? [{ id: domainEdgeId(domain.id, domain.target), source: domain.id, target: domain.target }]
      : [],
  );
}

export type DomainLinkError = "toDomain" | "fromDomainToDomain" | "duplicate" | "unknown";

/**
 * Link rules once a domain is involved. Domains link into services only (never
 * domain → domain, never service → domain). A domain that already has a target can be
 * linked again: the new link replaces the old one (the caller announces it), because a
 * domain routes to exactly one service. null: allowed.
 */
export function domainLinkError(
  domains: readonly CanvasDomain[],
  serviceIds: ReadonlySet<string>,
  source: string,
  target: string,
): DomainLinkError | null {
  const from = domains.find((domain) => domain.id === source);
  const toDomain = domains.some((domain) => domain.id === target);
  if (from && toDomain) return "fromDomainToDomain";
  if (toDomain) return serviceIds.has(source) ? "toDomain" : "unknown";
  if (!from) return null; // service → service: graph.linkError's rules apply
  if (!serviceIds.has(target)) return "unknown";
  return from.target === target ? "duplicate" : null;
}
