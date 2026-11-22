import type { ServiceKind, ServiceSource } from "./types";

export interface TemplateVersion {
  tag: string;
  /** Short label shown in the version picker, e.g. "17 (latest)" */
  label: string;
}

export interface ServiceTemplate {
  id: string;
  /** Display name in menus and dialogs, e.g. "PostgreSQL" */
  name: string;
  /** Default service name when added; unique-ified if already taken. */
  defaultName: string;
  kind: ServiceKind;
  /** Available versions; first is the default. */
  versions: TemplateVersion[];
  source: ServiceSource;
}

function imageSource(tag: string): ServiceSource {
  return { type: "image", label: tag };
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    id: "postgres",
    name: "PostgreSQL",
    defaultName: "postgres",
    kind: "database",
    versions: [
      { tag: "postgres:19-alpine", label: "19 — latest" },
      { tag: "postgres:18-alpine", label: "18" },
      { tag: "postgres:17-alpine", label: "17" },
      { tag: "postgres:16-alpine", label: "16" },
    ],
    source: imageSource("postgres:19-alpine"),
  },
  {
    id: "mysql",
    name: "MySQL",
    defaultName: "mysql",
    kind: "database",
    versions: [
      { tag: "mysql:9.7", label: "9.7 — latest LTS" },
      { tag: "mysql:8.4", label: "8.4" },
      { tag: "mysql:8.0", label: "8.0" },
    ],
    source: imageSource("mysql:9.7"),
  },
  {
    id: "redis",
    name: "Redis",
    defaultName: "redis",
    kind: "cache",
    versions: [
      { tag: "redis:8.10-alpine", label: "8.10 — latest" },
      { tag: "redis:8.4-alpine", label: "8.4" },
      { tag: "redis:7.4-alpine", label: "7.4" },
    ],
    source: imageSource("redis:8.10-alpine"),
  },
  {
    id: "mongodb",
    name: "MongoDB",
    defaultName: "mongodb",
    kind: "database",
    versions: [
      { tag: "mongo:9.0", label: "9.0 — latest" },
      { tag: "mongo:8.0", label: "8.0" },
      { tag: "mongo:7.0", label: "7.0" },
    ],
    source: imageSource("mongo:9.0"),
  },
  {
    id: "rabbitmq",
    name: "RabbitMQ",
    defaultName: "rabbitmq",
    kind: "service",
    versions: [
      { tag: "rabbitmq:4.4-management", label: "4.4 + management UI — latest" },
      { tag: "rabbitmq:4.4", label: "4.4" },
      { tag: "rabbitmq:4.3-management", label: "4.3 + management UI" },
      { tag: "rabbitmq:4.2-management", label: "4.2 + management UI" },
    ],
    source: imageSource("rabbitmq:4.4-management"),
  },
];

/** Returns a unique name based on the template's default, appending -2, -3, etc. if taken. */
export function uniqueTemplateName(defaultName: string, existingNames: readonly string[]): string {
  const taken = new Set(existingNames);
  if (!taken.has(defaultName)) return defaultName;
  let i = 2;
  while (taken.has(`${defaultName}-${i}`)) i++;
  return `${defaultName}-${i}`;
}
