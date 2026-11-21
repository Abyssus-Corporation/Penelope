import type { ServiceSourceType } from "./types";

/** Service names become internal hostnames, so they follow DNS label rules. */
export const SERVICE_NAME_MAX_LENGTH = 63;
const SERVICE_NAME_PATTERN = /^[a-z](?:[a-z0-9-]*[a-z0-9])?$/;
export const SOURCE_MAX_LENGTH = 200;

const SOURCE_PATTERNS: Record<ServiceSourceType, RegExp> = {
  // owner/name, as on GitHub, GitLab, Gitea and Cursor Origin.
  repo: /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
  // [registry/]name[:tag][@digest]; no spaces.
  image: /^[a-z0-9][a-z0-9._/-]*(?::[A-Za-z0-9._-]+)?(?:@sha256:[a-f0-9]{64})?$/,
  // Relative path inside the repo, e.g. services/api/Dockerfile.
  dockerfile: /^(?!\/)[A-Za-z0-9_./-]+$/,
};

export type ServiceNameError = "required" | "tooLong" | "invalid" | "taken";
export type SourceError = "required" | "tooLong" | "invalid";

export function validateServiceName(
  raw: string,
  existingNames: readonly string[],
): ServiceNameError | null {
  const name = raw.trim();
  if (!name) return "required";
  if (name.length > SERVICE_NAME_MAX_LENGTH) return "tooLong";
  if (!SERVICE_NAME_PATTERN.test(name)) return "invalid";
  if (existingNames.some((existing) => existing.toLowerCase() === name)) return "taken";
  return null;
}

export function validateSource(type: ServiceSourceType, raw: string): SourceError | null {
  const value = raw.trim();
  if (!value) return "required";
  if (value.length > SOURCE_MAX_LENGTH) return "tooLong";
  if (!SOURCE_PATTERNS[type].test(value)) return "invalid";
  return null;
}
