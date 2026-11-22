import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiProject } from "@/api";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { I18nProvider } from "@/i18n";
import { canvasKey } from "./storage";
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

let mediaListeners: (() => void)[] = [];
let narrowNow = false;
function mockViewport(narrow: boolean) {
  narrowNow = narrow;
  mediaListeners = [];
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        get matches() {
          return narrowNow && query === "(max-width: 767px)";
        },
        media: query,
        addEventListener: (_: string, listener: () => void) => mediaListeners.push(listener),
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}
/** Simulates the window crossing 768px. */
function resizeTo(narrow: boolean) {
  narrowNow = narrow;
  act(() => mediaListeners.forEach((listener) => listener()));
}

let browserBack = () => {};
function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  browserBack = () => navigate(-1);
  return <output data-testid="search">{location.search}</output>;
}

function renderView(url = "/projects/acme-production") {
  render(
    <MemoryRouter initialEntries={["/projects", url]} initialIndex={1}>
      <I18nProvider>
        <ProjectCanvasView project={project} header={<h1>{project.name}</h1>} />
        <Location />
      </I18nProvider>
    </MemoryRouter>,
  );
}
const search = () => screen.getByTestId("search").textContent;

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
    expect(await screen.findByRole("radio", { name: "List" })).toHaveAttribute("data-state", "on");
    expect(screen.getByRole("radio", { name: "Canvas" })).toHaveAttribute("data-state", "off");

    const list = await screen.findByRole("list", { name: "Services" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(items[1]!).getByText("Connects to postgres, redis")).toBeInTheDocument();
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
    expect(search()).toBe("?node=api");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(row).toHaveFocus();
    expect(search()).toBe("");
  });

  it("keeps the open sheet in the URL, so Back closes it", async () => {
    mockViewport(true);
    renderView();
    const user = userEvent.setup();
    const list = await screen.findByRole("list", { name: "Services" });
    await user.click(within(list).getByRole("button", { name: /^redis/ }));
    expect(await screen.findByRole("dialog", { name: "redis" })).toBeVisible();
    // Browser Back pops ?node=redis, and the sheet closes with it.
    act(() => browserBack());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(search()).toBe("");
  });

  it("opens the sheet from a deep link", async () => {
    mockViewport(false);
    renderView("/projects/acme-production?node=postgres");
    expect(await screen.findByRole("dialog", { name: "postgres" })).toBeVisible();
  });

  it("still opens old ?service= links, rewritten to ?node=", async () => {
    mockViewport(false);
    renderView("/projects/acme-production?service=postgres");
    expect(await screen.findByRole("dialog", { name: "postgres" })).toBeVisible();
    await waitFor(() => expect(search()).toBe("?node=postgres"));
  });

  it("ignores a deep link to a service that doesn't exist", async () => {
    mockViewport(true);
    renderView("/projects/acme-production?node=nope");
    await screen.findByRole("list", { name: "Services" });
    await waitFor(() => expect(search()).toBe(""));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("follows resizes across 768px until the user picks a view", async () => {
    mockViewport(true);
    renderView();
    await screen.findByRole("list", { name: "Services" });
    resizeTo(false);
    expect(
      await screen.findByRole("region", { name: "Service canvas" }, { timeout: 5000 }),
    ).toBeInTheDocument();
    resizeTo(true);
    expect(await screen.findByRole("list", { name: "Services" })).toBeInTheDocument();

    // An explicit choice sticks.
    await userEvent.setup().click(screen.getByRole("radio", { name: "Canvas" }));
    resizeTo(false);
    resizeTo(true);
    expect(screen.getByRole("radio", { name: "Canvas" })).toHaveAttribute("data-state", "on");
  });

  it("links and unlinks services from the sheet's Connections section, and the list follows", async () => {
    mockViewport(true);
    renderView();
    const user = userEvent.setup();
    const list = await screen.findByRole("list", { name: "Services" });
    await user.click(within(list).getByRole("button", { name: /^web/ }));
    const sheet = await screen.findByRole("dialog", { name: "web" });
    await user.click(within(sheet).getByRole("tab", { name: "Settings" }));
    const connections = within(sheet).getByRole("region", { name: "Connections" });

    // web → api exists already, so api isn't offered; postgres is.
    await user.click(within(connections).getByRole("button", { name: "postgres" }));
    expect(screen.queryByRole("menuitem", { name: "api" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "web" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("menuitem", { name: "postgres" }));
    await user.click(within(connections).getByRole("button", { name: "Add" }));
    expect(
      within(connections).getByRole("button", { name: "Remove connection from web to postgres" }),
    ).toBeInTheDocument();
    expect(within(connections).getByText("web now connects to postgres.")).toBeInTheDocument();
    // redis is still on offer, so the Add button keeps focus.
    expect(within(connections).getByRole("button", { name: "Add" })).toHaveFocus();

    const removeApi = within(connections).getByRole("button", {
      name: "Remove connection from web to api",
    });
    await user.click(removeApi);
    expect(removeApi).not.toBeInTheDocument();
    // Focus moves to the next remove button, not to the body.
    await waitFor(() =>
      expect(
        within(connections).getByRole("button", { name: "Remove connection from web to postgres" }),
      ).toHaveFocus(),
    );

    const stored = JSON.parse(localStorage.getItem(canvasKey("acme-production"))!);
    expect(stored.version).toBe(2);
    expect(stored.edges).toEqual(
      expect.arrayContaining([{ id: "web->postgres", source: "web", target: "postgres" }]),
    );
    expect(stored.edges).not.toContainEqual(expect.objectContaining({ id: "web->api" }));

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const items = within(screen.getByRole("list", { name: "Services" })).getAllByRole("listitem");
    expect(within(items[0]!).getByText("Connects to postgres")).toBeInTheDocument();
  });

  it("adds a service from the toolbar, with validation, and keeps it after a reload", async () => {
    mockViewport(true);
    renderView();
    const user = userEvent.setup();
    await screen.findByRole("list", { name: "Services" });
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(await screen.findByRole("menuitem", { name: "Docker" }));
    const dialog = await screen.findByRole("dialog", { name: "Add Docker service" });
    const name = within(dialog).getByRole("textbox", { name: "Service name" });
    expect(name).toHaveFocus();

    await user.type(name, "api");
    await user.click(within(dialog).getByRole("button", { name: "Add service" }));
    expect(name).toHaveAccessibleDescription(
      "A service with this name already exists in this project.",
    );
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveFocus();

    await user.clear(name);
    await user.type(name, "billing-worker");
    await user.click(within(dialog).getByLabelText("Type"));
    await user.click(await screen.findByRole("menuitem", { name: "Worker" }));
    const source = within(dialog).getByRole("textbox", { name: "Image name" });
    await user.type(source, "not an image");
    await user.click(within(dialog).getByRole("button", { name: "Add service" }));
    expect(source).toHaveFocus();
    expect(source).toHaveAccessibleDescription(
      "Use an image name like postgres:16-alpine, without spaces.",
    );
    await user.clear(source);
    await user.type(source, "ghcr.io/acme/billing:1.2");
    await user.click(within(dialog).getByRole("button", { name: "Add service" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const row = within(screen.getByRole("list", { name: "Services" })).getByRole("button", {
      name: /^billing-worker/,
    });
    expect(row).toHaveTextContent("Not deployed");
    await waitFor(() => expect(row).toHaveFocus());
    expect(screen.getByText("Added billing-worker.")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(canvasKey("acme-production"))!);
    expect(stored.services).toEqual([
      {
        id: "billing-worker",
        name: "billing-worker",
        kind: "worker",
        source: { type: "image", label: "ghcr.io/acme/billing:1.2" },
      },
    ]);
  });

  it("adds a generated domain, linked to its service, from the Add menu", async () => {
    mockViewport(true);
    renderView();
    const user = userEvent.setup();
    await screen.findByRole("list", { name: "Services" });
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(await screen.findByRole("menuitem", { name: "Domain" }));
    const dialog = await screen.findByRole("dialog", { name: "Add a domain" });
    expect(within(dialog).getByRole("radio", { name: "Generate a Penelope domain" })).toBeChecked();
    await user.click(within(dialog).getByLabelText("Target service"));
    await user.click(await screen.findByRole("menuitem", { name: "api" }));
    const sub = within(dialog).getByRole("textbox", { name: "Subdomain" });
    expect((sub as HTMLInputElement).value).toMatch(/^api-[0-9a-f]{6}$/);
    await user.clear(sub);
    await user.type(sub, "-bad");
    await user.click(within(dialog).getByRole("button", { name: "Add domain" }));
    expect(sub).toHaveFocus();
    expect(sub).toHaveAttribute("aria-invalid", "true");
    await user.clear(sub);
    await user.type(sub, "shop");
    await user.click(within(dialog).getByRole("button", { name: "Add domain" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const row = await screen.findByRole("button", { name: /^shop\.penelope\.local/ });
    expect(row).toHaveTextContent("Verified");
    expect(row).toHaveTextContent("HTTPS active");
    expect(row).toHaveTextContent("routes to api");
    await waitFor(() => expect(row).toHaveFocus());
    const stored = JSON.parse(localStorage.getItem(canvasKey("acme-production"))!);
    expect(stored.domains).toEqual([
      {
        id: "shop.penelope.local",
        hostname: "shop.penelope.local",
        type: "generated",
        target: "api",
        port: 8080,
        verified: true,
      },
    ]);

    // The service sheet lists it under Connections, with an unlink button.
    await user.click(
      within(screen.getByRole("list", { name: "Services" })).getByRole("button", { name: /^api/ }),
    );
    const sheet = await screen.findByRole("dialog", { name: "api" });
    await user.click(within(sheet).getByRole("tab", { name: "Settings" }));
    await user.click(
      within(sheet).getByRole("button", { name: "Unlink shop.penelope.local from api" }),
    );
    expect(
      within(sheet).getByText("shop.penelope.local no longer routes to api."),
    ).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(canvasKey("acme-production"))!).domains[0].target,
    ).toBeNull();
  });

  it("adds a custom IDN domain with DNS records, then verifies it from its sheet", async () => {
    mockViewport(true);
    renderView();
    const user = userEvent.setup();
    await screen.findByRole("list", { name: "Services" });
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(await screen.findByRole("menuitem", { name: "Domain" }));
    const dialog = await screen.findByRole("dialog", { name: "Add a domain" });
    await user.click(within(dialog).getByRole("radio", { name: "Use my own domain" }));
    const host = within(dialog).getByRole("textbox", { name: "Domain name" });
    await user.type(host, "https://shop.example.com");
    await user.click(within(dialog).getByRole("button", { name: "Add domain" }));
    expect(host).toHaveFocus();
    expect(host).toHaveAccessibleDescription(/Leave out the scheme/);

    await user.clear(host);
    await user.type(host, "Café.example.com");
    expect(host).toHaveAccessibleDescription("Saved as xn--caf-dma.example.com (punycode).");
    const dns = within(dialog).getByRole("region", { name: "DNS records" });
    expect(dns).toHaveTextContent("CNAME");
    expect(dns).toHaveTextContent("xn--caf-dma");
    await user.click(within(dialog).getByRole("button", { name: "Add domain" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const row = await screen.findByRole("button", { name: /^xn--caf-dma\.example\.com/ });
    expect(row).toHaveTextContent("Pending DNS");
    expect(row).toHaveTextContent("not linked to a service");
    await user.click(row);
    const sheet = await screen.findByRole("dialog", { name: "xn--caf-dma.example.com" });
    expect(search()).toBe("?node=xn--caf-dma.example.com");
    expect(within(sheet).getByText("HTTPS issuing")).toBeInTheDocument();
    await user.selectOptions(
      within(sheet).getByRole("combobox", { name: "Target service" }),
      "web",
    );
    const port = within(sheet).getByRole("textbox", { name: "Port" });
    await user.clear(port);
    await user.type(port, "70000");
    await user.click(within(sheet).getByRole("button", { name: "Save port" }));
    expect(port).toHaveAccessibleDescription("Use a whole number from 1 to 65535.");
    await user.clear(port);
    await user.type(port, "3000");
    await user.click(within(sheet).getByRole("button", { name: "Save port" }));

    await user.click(within(sheet).getByRole("button", { name: "Check again" }));
    expect(within(sheet).getByRole("button", { name: "Checking DNS…" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await waitFor(() => expect(within(sheet).getByText("HTTPS active")).toBeInTheDocument());
    const stored = JSON.parse(localStorage.getItem(canvasKey("acme-production"))!);
    expect(stored.domains[0]).toMatchObject({ target: "web", port: 3000, verified: true });
  });

  it("opens a canvas node with Enter or Space and returns focus to it on Esc", async () => {
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
    // Plain words, not React Flow's "node".
    expect(node).toHaveAttribute("aria-roledescription", "service");
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

    await user.keyboard(" ");
    expect(await screen.findByRole("dialog", { name: "api" })).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Esc on the card itself (no sheet open) keeps focus there.
    await user.keyboard("{Escape}");
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
