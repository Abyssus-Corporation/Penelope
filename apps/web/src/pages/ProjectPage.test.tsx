import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiUnavailableError, type ApiProject } from "@/api";
import { I18nProvider } from "@/i18n";
import { routes } from "@/routes";

vi.mock("@/api", async (importActual) => ({
  ApiUnavailableError: (await importActual<typeof import("@/api")>()).ApiUnavailableError,
  api: { projects: { get: vi.fn() } },
}));
// React Flow measures nodes; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
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
    expect(screen.getByText(/GitHub · acme\/app/)).toBeVisible();
    // Wide screens start on the canvas; both services are focusable nodes there.
    const canvas = await screen.findByRole("region", { name: "Service canvas" }, { timeout: 5000 });
    expect(canvas).toHaveAccessibleDescription(/Enter or Space opens a service/);
    await waitFor(() =>
      expect(canvas.querySelector('.react-flow__node[data-id="worker"]')).toHaveTextContent(
        /^worker.*No source connected.*Failed.*No deploys yet.*Service, No connections$/,
      ),
    );
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
    // Nothing to switch between, and no canvas to load.
    expect(screen.queryByRole("group", { name: "View" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Service canvas" })).not.toBeInTheDocument();
  });

  it("shows not found for an unknown id without echoing it", async () => {
    getProject.mockResolvedValueOnce(null);
    const id = "Call-support-at-555-0100-$&";
    renderAt(`/projects/${encodeURIComponent(id)}`);

    expect(await screen.findByRole("heading", { name: "Project not found" })).toBeVisible();
    expect(screen.getByText(/This project doesn't exist/)).toBeVisible();
    expect(document.body).not.toHaveTextContent("555-0100");
    expect(screen.getByRole("link", { name: "Back to projects" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("offers a retry when loading fails", async () => {
    getProject.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(project);
    renderAt("/projects/acme");

    expect(await screen.findByRole("link", { name: "Back to projects" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "acme" })).toBeVisible();
    expect(getProject).toHaveBeenCalledTimes(2);
  });

  it("explains when no API is connected (production without a backend)", async () => {
    getProject.mockRejectedValueOnce(new ApiUnavailableError());
    renderAt("/projects/acme");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Project data isn't available" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to projects" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
