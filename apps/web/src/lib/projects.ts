import type { GitProvider, Project, ProjectRepo } from "@/types/project";

export const PROJECT_NAME_MAX_LENGTH = 48;
const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9._/-]*$/i;

export type ProjectNameError = "required" | "tooLong" | "invalid" | "taken";

export function validateProjectName(
  rawName: string,
  existingNames: readonly string[],
): ProjectNameError | null {
  const name = rawName.trim();
  if (!name) return "required";
  if (name.length > PROJECT_NAME_MAX_LENGTH) return "tooLong";
  if (!PROJECT_NAME_PATTERN.test(name)) return "invalid";
  const lower = name.toLowerCase();
  if (existingNames.some((n) => n.toLowerCase() === lower)) return "taken";
  return null;
}

const HOSTS: Record<string, GitProvider> = {
  "github.com": "github",
  "gitlab.com": "gitlab",
  "bitbucket.org": "bitbucket",
};

const SEGMENT = /^[a-z0-9._-]+$/i;

/**
 * Parses "owner/repo" (assumed GitHub) or a GitHub/GitLab/Bitbucket URL.
 * Returns null when the input is not a recognisable repository.
 */
export function parseRepository(raw: string): Omit<ProjectRepo, "lastCommit"> | null {
  let value = raw.trim();
  if (!value) return null;

  let provider: GitProvider = "github";
  const url = value.match(/^(?:https?:\/\/)?(?:www\.)?([^/]+\.[^/]+)\/(.+)$/i);
  if (url) {
    const host = HOSTS[url[1].toLowerCase()];
    if (!host) return null;
    provider = host;
    value = url[2];
  }

  const [owner, name, ...rest] = value
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "")
    .split("/");
  if (!owner || !name || rest.length > 0) return null;
  if (!SEGMENT.test(owner) || !SEGMENT.test(name)) return null;
  return { provider, owner, name };
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export function uniqueProjectId(name: string, existingIds: readonly string[]) {
  const base = slugify(name);
  let id = base;
  for (let i = 2; existingIds.includes(id); i++) id = `${base}-${i}`;
  return id;
}

export function createProject(input: {
  name: string;
  repository?: string;
  deployedAt: string;
  existingIds: readonly string[];
}): Project {
  const name = input.name.trim();
  const repo = input.repository ? parseRepository(input.repository) : null;
  return {
    id: uniqueProjectId(name, input.existingIds),
    name,
    services: [],
    deployedAt: input.deployedAt,
    ...(repo ? { repo } : {}),
  };
}
