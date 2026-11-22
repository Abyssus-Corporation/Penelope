import { describe, expect, it } from "vitest";
import { SERVICE_NAME_MAX_LENGTH, validateServiceName, validateSource } from "./validation";

describe("service name", () => {
  it.each([
    ["", "required"],
    ["   ", "required"],
    ["a".repeat(SERVICE_NAME_MAX_LENGTH + 1), "tooLong"],
    ["Billing", "invalid"],
    ["9lives", "invalid"],
    ["billing-", "invalid"],
    ["billing_worker", "invalid"],
    ["bil ling", "invalid"],
    ["api", "taken"],
    ["API", "invalid"],
  ])("%j is %s", (name, error) => {
    expect(validateServiceName(name, ["web", "api"])).toBe(error);
  });

  it("accepts DNS-label names, trimmed", () => {
    expect(validateServiceName("  billing-worker-2 ", ["web"])).toBeNull();
    expect(validateServiceName("a".repeat(SERVICE_NAME_MAX_LENGTH), [])).toBeNull();
  });
});

describe("service source", () => {
  it.each([
    ["repo", "acme/billing", null],
    ["repo", "acme", "invalid"],
    ["repo", "acme/bil ling", "invalid"],
    ["image", "postgres:16-alpine", null],
    ["image", "ghcr.io/acme/billing:1.2", null],
    ["image", "Postgres", "invalid"],
    ["dockerfile", "FROM node:22-alpine\nRUN npm install", null],
    ["dockerfile", "   ", "required"],
    ["image", "x".repeat(201), "tooLong"],
  ] as const)("%s %j → %s", (type, value, error) => {
    expect(validateSource(type, value)).toBe(error);
  });
});
