import { render, screen } from "@testing-library/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import type { Project } from "@/types/project";
import { ProjectCard } from "./ProjectCard";

function renderCard(project: Project) {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <Tooltip.Provider>
          <ProjectCard project={project} />
        </Tooltip.Provider>
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe("ProjectCard", () => {
  it("shows an empty state, not 'Idle', for a project without services", () => {
    renderCard({ id: "new", name: "new", services: [], deployedAt: new Date().toISOString() });

    expect(screen.getByText("Empty")).toBeInTheDocument();
    expect(screen.queryByText("Idle")).not.toBeInTheDocument();
    expect(screen.getByText("0 services")).toBeInTheDocument();
  });

  it("exposes the full name and renders a machine-readable deploy time", () => {
    const name = "northwind-industries-holdings-production-eu-west1";
    const deployedAt = new Date(Date.now() - 4 * 60_000).toISOString();
    renderCard({ id: "nw", name, services: [{ name: "web", status: "running" }], deployedAt });

    const visible = screen.getByText(name);
    expect(visible.className).not.toMatch(/line-clamp|truncate/);
    expect(screen.getByRole("link")).toHaveAccessibleName(expect.stringContaining(name));
    expect(screen.getByText("1 service")).toBeInTheDocument();
    const time = screen.getByText("4m ago");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", deployedAt);
  });

  it("hides the deploy time instead of echoing a value that is not a date", () => {
    renderCard({ id: "x", name: "x", services: [], deployedAt: "yesterday-ish" });

    expect(screen.queryByText("yesterday-ish")).not.toBeInTheDocument();
  });
});
