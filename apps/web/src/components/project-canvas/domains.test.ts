import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORT,
  LABEL_MAX_LENGTH,
  PLATFORM_A,
  PLATFORM_AAAA,
  PLATFORM_CNAME,
  dnsRecords,
  domainEdges,
  domainLinkError,
  generateLabel,
  generatedHostname,
  isApex,
  normalizeHostname,
  splitHostname,
  validateLabel,
  validatePort,
} from "./domains";
import type { CanvasDomain } from "./types";

const domain = (id: string, target: string | null = null): CanvasDomain => ({
  id,
  hostname: id,
  type: "custom",
  target,
  port: DEFAULT_PORT,
  verified: false,
});

describe("hostname validation", () => {
  it.each([
    ["app.example.com", "app.example.com"],
    ["  App.Example.COM  ", "app.example.com"],
    ["example.com.", "example.com"],
    ["a-b.c-d.io", "a-b.c-d.io"],
    ["xn--caf-dma.fr", "xn--caf-dma.fr"],
    // IDN → punycode through the URL parser.
    ["café.fr", "xn--caf-dma.fr"],
    ["Bücher.example", "xn--bcher-kva.example"],
    ["例え.jp", "xn--r8jz45g.jp"],
    [`${"a".repeat(63)}.com`, `${"a".repeat(63)}.com`],
  ])("accepts %j as %j", (raw, hostname) => {
    expect(normalizeHostname(raw)).toEqual({ hostname, error: null });
  });

  it.each([
    ["", "required"],
    ["   ", "required"],
    ["https://example.com", "scheme"],
    ["ftp://example.com", "scheme"],
    ["example.com/path", "pathOrPort"],
    ["example.com:8080", "pathOrPort"],
    ["user@example.com", "pathOrPort"],
    ["example.com?x", "pathOrPort"],
    ["exa mple.com", "invalid"],
    ["-app.example.com", "invalid"],
    ["app-.example.com", "invalid"],
    ["app..example.com", "invalid"],
    ["app_1.example.com", "invalid"],
    ["example.123", "invalid"],
    ["localhost", "noDot"],
    ["1.2.3.4", "ip"],
    [`${"a".repeat(64)}.com`, "labelTooLong"],
    [`${Array.from({ length: 5 }, () => "a".repeat(60)).join(".")}.com`, "tooLong"],
    ["shop.penelope.local", "reserved"],
    ["penelope.local", "reserved"],
  ])("rejects %j (%s)", (raw, error) => {
    expect(normalizeHostname(raw).error).toBe(error);
  });

  it("is unique within the project, after normalization", () => {
    expect(normalizeHostname("APP.example.com", ["app.example.com"]).error).toBe("taken");
    expect(normalizeHostname("café.fr", ["xn--caf-dma.fr"]).error).toBe("taken");
  });

  it("validates a single subdomain label", () => {
    expect(validateLabel("web-1a2b3c")).toBeNull();
    expect(validateLabel("")).toBe("required");
    expect(validateLabel("a".repeat(LABEL_MAX_LENGTH + 1))).toBe("tooLong");
    expect(validateLabel("Web")).toBe("invalid");
    expect(validateLabel("a.b")).toBe("invalid");
    expect(validateLabel("-a")).toBe("invalid");
  });
});

describe("apex heuristic and DNS records", () => {
  it.each([
    ["example.com", true],
    ["example.co.uk", true],
    ["example.com.br", true],
    ["www.example.com", false],
    ["app.example.co.uk", false],
    ["a.b.example.com.br", false],
    // Not in the small suffix list: shown as a subdomain (the heuristic's known limit).
    ["example.gov.pl", false],
  ])("%s is apex: %s", (hostname, apex) => {
    expect(isApex(hostname)).toBe(apex);
  });

  it("splits into the registrable part and the rest", () => {
    expect(splitHostname("a.b.example.co.uk")).toEqual({ apex: "example.co.uk", sub: "a.b" });
  });

  it("asks for A + AAAA at the apex and a CNAME elsewhere, with documentation-range values", () => {
    expect(dnsRecords("example.com.br")).toEqual([
      { type: "A", host: "@", value: PLATFORM_A },
      { type: "AAAA", host: "@", value: PLATFORM_AAAA },
    ]);
    expect(dnsRecords("api.eu.example.com")).toEqual([
      { type: "CNAME", host: "api.eu", value: PLATFORM_CNAME },
    ]);
    expect(PLATFORM_A).toMatch(/^192\.0\.2\./);
    expect(PLATFORM_AAAA).toMatch(/^2001:db8::/);
  });
});

describe("generated domains and ports", () => {
  it("makes '<service>-<6 hex>' labels that always validate", () => {
    const label = generateLabel("web", () => 0.5);
    expect(label).toBe("web-888888");
    expect(generatedHostname(label)).toBe("web-888888.penelope.local");
    const long = generateLabel(`${"a".repeat(60)}-b`);
    expect(long.length).toBeLessThanOrEqual(LABEL_MAX_LENGTH);
    expect(validateLabel(long)).toBeNull();
    expect(
      validateLabel(generateLabel("x-------------------------------------------------------y")),
    ).toBeNull();
  });

  it.each([
    ["1", null],
    ["65535", null],
    [" 443 ", null],
    ["", "required"],
    ["0", "invalid"],
    ["65536", "invalid"],
    ["80.5", "invalid"],
    ["-1", "invalid"],
    ["1e3", "invalid"],
  ])("port %j → %s", (raw, error) => {
    expect(validatePort(raw)).toBe(error);
  });
});

describe("domain link rules", () => {
  const services = new Set(["web", "api", "postgres"]);
  const domains = [domain("a.example.com", "web"), domain("b.example.com")];

  it("lets a domain link to one service, replacing its current target", () => {
    expect(domainLinkError(domains, services, "b.example.com", "api")).toBeNull();
    // Already routes to web: linking to api replaces it (announced by the caller).
    expect(domainLinkError(domains, services, "a.example.com", "api")).toBeNull();
    expect(domainLinkError(domains, services, "a.example.com", "web")).toBe("duplicate");
  });

  it("rejects domain → domain and service → domain", () => {
    expect(domainLinkError(domains, services, "a.example.com", "b.example.com")).toBe(
      "fromDomainToDomain",
    );
    expect(domainLinkError(domains, services, "web", "b.example.com")).toBe("toDomain");
    expect(domainLinkError(domains, services, "a.example.com", "ghost")).toBe("unknown");
  });

  it("leaves service → service links to the service rules", () => {
    expect(domainLinkError(domains, services, "web", "api")).toBeNull();
  });

  it("draws one edge per linked domain", () => {
    expect(domainEdges(domains)).toEqual([
      { id: "a.example.com->web", source: "a.example.com", target: "web" },
    ]);
  });
});
