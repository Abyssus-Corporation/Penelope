import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ErrorPage } from "@/pages/ErrorPage";
import { I18nProvider } from "@/i18n";
import { routes } from "./routes";

function renderRouter(routeList: RouteObject[], path: string) {
  render(
    <I18nProvider>
      <RouterProvider router={createMemoryRouter(routeList, { initialEntries: [path] })} />
    </I18nProvider>,
  );
}

describe("routes", () => {
  it("renders the 404 page for unknown paths without echoing the path", () => {
    renderRouter(routes, "/no-such-page-<b>x</b>");
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Go to projects" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByText(/no-such-page/)).toBeNull();
    expect(screen.getAllByRole("link", { name: "Skip to main content" })).toHaveLength(1);
  });

  it("renders the error page without error details when a route throws", () => {
    // React reports the thrown error before the errorElement catches it; keep test output quiet.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const silence = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", silence);
    function Boom(): never {
      throw new Error("secret stack detail");
    }
    renderRouter([{ path: "/", element: <Boom />, errorElement: <ErrorPage /> }], "/");
    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeVisible();
    expect(screen.queryByText(/secret stack detail/)).toBeNull();
    // The errorElement replaces RootLayout, so it brings its own (single) skip link.
    expect(screen.getAllByRole("link", { name: "Skip to main content" })).toHaveLength(1);
    window.removeEventListener("error", silence);
    vi.mocked(console.error).mockRestore();
  });
});
