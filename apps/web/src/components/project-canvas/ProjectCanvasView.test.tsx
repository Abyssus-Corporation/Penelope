import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiProject } from "@/api";
import { I18nProvider } from "@/i18n";
import { ProjectCanvasView } from "./ProjectCanvasView";

// React Flow measures nodes; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// "acme-production" has fixture details (kinds, sources, references) in dev/test.
const project: ApiProject = {
  id: "acme-production",
  name: "acme-production",
  deployedAt: "2026-11-20T09:41:00Z",
  services: [
    { name: "web", status: "running" },
    { name: "api", status: "failed" },
    { name: "postgres", status: "running" },
    { name: "redis", status: "sleeping" },
  ],
  repo: null,
};

function mockViewport(narrow: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: narrow && query === "(max-width: 767px)",
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

function renderView() {
  render(
    <I18nProvider>
      <ProjectCanvasView project={project} header={<h1>{project.name}</h1>} />
    </I18nProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("ProjectCanvasView", () => {
  it("defaults to the list on narrow screens, with the same open action", async () => {
    mockViewport(true);
    renderView();
    // Decided on the first render (matchMedia in the state initialiser), not in an
    // effect after mount, so the canvas never flashes on phones.
    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute("data-state", "on");
    expect(screen.getByRole("radio", { name: "Canvas" })).toHaveAttribute("data-state", "off");

    const list = await screen.findByRole("list", { name: "Services" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(items[1]!).getByText("Connects to postgres, redis")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "List" })).toHaveAttribute("data-state", "on");
    expect(screen.queryByRole("region", { name: "Service canvas" })).not.toBeInTheDocument();

    const user = userEvent.setup();
    const row = within(list).getByRole("button", { name: /^api/ });
    row.focus();
    await user.keyboard("{Enter}");
    const sheet = await screen.findByRole("dialog", { name: "api" });
    expect(within(sheet).getByRole("tab", { name: "Deployments" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(within(sheet).getByRole("tab", { name: "Settings" }));
    expect(within(sheet).getByText("postgres, redis")).toBeVisible();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(row).toHaveFocus();
  });

  it("opens a canvas node with Enter and returns focus to it on Esc", async () => {
    mockViewport(false);
    renderView();

    const region = await screen.findByRole("region", { name: "Service canvas" }, { timeout: 5000 });
    expect(region).toHaveAccessibleDescription(/Tab moves between services/);
    // jsdom can't measure nodes, so React Flow keeps them visibility:hidden (out of
    // the a11y tree) here; the real-browser path is covered by the e2e and axe runs.
    const node = await waitFor(() => {
      const element = region.querySelector<HTMLElement>('.react-flow__node[data-id="api"]');
      if (!element) throw new Error("api node not rendered yet");
      return element;
    });
    expect(node).toHaveAttribute("role", "button");
    // Name from content (no aria-label), so it always matches the visible text.
    expect(node).not.toHaveAttribute("aria-label");
    expect(node.textContent).toMatch(
      /^api.*acme\/api.*Failed.*Deployed .+ ago.*Service, Connects to postgres, redis$/,
    );
    expect(node).toHaveAttribute("tabindex", "0");
    expect(node).toHaveAttribute("aria-haspopup", "dialog");

    const user = userEvent.setup();
    node.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "api" })).toBeVisible();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(node).toHaveFocus();
  });

  it("announces view switches", async () => {
    mockViewport(false);
    renderView();
    const user = userEvent.setup();
    await screen.findByRole("region", { name: "Service canvas" }, { timeout: 5000 });

    await user.click(screen.getByRole("radio", { name: "List" }));
    expect(screen.getByText("Showing list view")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("list", { name: "Services" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Canvas" }));
    expect(screen.getByText("Showing canvas view")).toBeInTheDocument();
    expect(
      await screen.findByRole("region", { name: "Service canvas" }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});
