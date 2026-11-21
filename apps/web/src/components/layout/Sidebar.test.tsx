import { render, screen } from "@testing-library/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n";
import { Sidebar } from "./Sidebar";

function renderAt(path: string) {
  render(
    <I18nProvider>
      <Tooltip.Provider>
        <MemoryRouter initialEntries={[path]}>
          <Sidebar collapsed={false} />
        </MemoryRouter>
      </Tooltip.Provider>
    </I18nProvider>,
  );
}

const current = () =>
  screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");

describe("Sidebar", () => {
  it.each(["/dashboard", "/projects/acme-production"])(
    "marks only Projects as the current page on %s",
    (path) => {
      renderAt(path);
      expect(current()).toEqual([screen.getByRole("link", { name: "Projects" })]);
    },
  );

  it("marks nothing on a path that only starts with /projects", () => {
    renderAt("/projectsettings");
    expect(current()).toEqual([]);
  });
});
