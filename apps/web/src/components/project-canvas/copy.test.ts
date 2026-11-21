import { describe, expect, it } from "vitest";
import { en } from "@/i18n/locales/en";

// ADR 0002: the 1.0 Git providers are GitHub, GitLab, Gitea and Cursor Origin (Bitbucket later).
const PROVIDERS = ["GitHub", "GitLab", "Gitea", "Cursor Origin"];
const OTHERS = ["Bitbucket", "Azure", "SourceHut", "Codeberg"];

describe("Add service copy", () => {
  it("the repository hint names exactly the 1.0 providers", () => {
    const hint = en.project.add.sourceHint.repo;
    for (const name of PROVIDERS) expect(hint).toContain(name);
    for (const name of OTHERS) expect(hint).not.toContain(name);
    expect(hint).toBe("owner/name, as on GitHub, GitLab, Gitea or Cursor Origin.");
  });

  it("no Add service string mentions Bitbucket", () => {
    expect(JSON.stringify(en.project.add)).not.toMatch(/bitbucket/i);
  });
});
