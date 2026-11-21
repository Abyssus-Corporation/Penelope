import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, type ApiProject } from "@/api";
import { I18nProvider } from "@/i18n";
import { routes } from "@/routes";

vi.mock("@/api", () => ({ api: { projects: { get: vi.fn() } } }));
const getProject = vi.mocked(api.projects.get);

function renderAt(path: string) {
  render(
    <I18nProvider>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </I18nProvider>,
  );
}

const project: ApiProject = {
  id: "acme",
  name: "acme",
  deployedAt: "2026-11-20T09:41:00Z",
  services: [
    { name: "web", status: "running" },
    { name: "worker", status: "failed" },
  ],
  repo: { provider: "github", owner: "acme", name: "app", lastCommit: null },
};

describe("ProjectPage", () => {
  afterEach(() => getProject.mockReset());

  it("announces loading, then shows the project", async () => {
    getProject.mockResolvedValueOnce(project);
    renderAt("/projects/acme");

    expect(screen.getByRole("status")).toHaveTextContent("Loading project…");
    expect(await screen.findByRole("heading", { level: 1, name: "acme" })).toBeVisible();
    expect(getProject).toHaveBeenCalledWith("acme");
    expect(screen.getByText("2 services")).toBeVisible();
    expect(screen.getByText("Failed")).toBeVisible();
    expect(screen.getByText("acme/app")).toBeVisible();
    expect(screen.getByText("No commits deployed yet.")).toBeVisible();
    // Rendered inside the dashboard shell: sidebar nav plus a breadcrumb back to Projects.
    expect(screen.getByRole("complementary")).toBeInTheDocument();
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(breadcrumb).toHaveTextContent("Projectsacme");
    expect(breadcrumb.querySelector('[aria-current="page"]')).toHaveTextContent("acme");
  });

  it("shows empty states for a project without services or repository", async () => {
    getProject.mockResolvedValueOnce({ ...project, services: [], repo: null, deployedAt: "" });
    renderAt("/projects/acme");

    expect(await screen.findByText(/No services yet/)).toBeVisible();
    expect(screen.getByText("0 services")).toBeVisible();
    expect(screen.getByText("Never deployed")).toBeVisible();
    expect(screen.getByText("Not connected to a Git repository.")).toBeVisible();
  });

  it("shows not found for an unknown id", async () => {
    getProject.mockResolvedValueOnce(null);
    renderAt("/projects/missing");

    expect(await screen.findByRole("heading", { name: "Project not found" })).toBeVisible();
    expect(screen.getByText(/no project with the ID missing/)).toBeVisible();
  });

  it("offers a retry when loading fails", async () => {
    getProject.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(project);
    renderAt("/projects/acme");

    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "acme" })).toBeVisible();
    expect(getProject).toHaveBeenCalledTimes(2);
  });
});
