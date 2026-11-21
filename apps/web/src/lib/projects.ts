import type { Project } from "@/types/project";

export const PROJECT_NAME_MAX_LENGTH = 48;
const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i;

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
  deployedAt: string;
  existingIds: readonly string[];
}): Project {
  const name = input.name.trim();
  return {
    id: uniqueProjectId(name, input.existingIds),
    name,
    services: [],
    deployedAt: input.deployedAt,
  };
}
