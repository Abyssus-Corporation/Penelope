import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n";
import type { Project } from "@/types/project";
import { CreateProjectDialog } from "./CreateProjectDialog";

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

const existingProjects: Project[] = [
  { id: "acme-production", name: "acme-production", services: [], deployedAt: "1 day ago" },
];

function renderDialog(onCreate = vi.fn()) {
  render(
    <I18nProvider>
      <CreateProjectDialog
        trigger={<button type="button">New project</button>}
        existingProjects={existingProjects}
        onCreate={onCreate}
      />
    </I18nProvider>,
  );
  return onCreate;
}

describe("CreateProjectDialog", () => {
  it("opens from the New project button", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New project" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeVisible();
    expect(screen.getByRole("heading", { name: "Create a new project" })).toBeVisible();
    expect(screen.getByLabelText("Project name")).toHaveFocus();
  });

  it("shows a validation error for an invalid name and stays open", async () => {
    const user = userEvent.setup();
    const onCreate = renderDialog();

    await user.click(screen.getByRole("button", { name: "New project" }));
    await screen.findByRole("dialog");
    await user.type(screen.getByLabelText("Project name"), "foo/bar");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Start with a letter or number; use only letters, numbers, . - _",
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates the project, closes the dialog, and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const onCreate = renderDialog();
    const trigger = screen.getByRole("button", { name: "New project" });

    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.type(screen.getByLabelText("Project name"), "my-app");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0]).toMatchObject({ name: "my-app", services: [] });
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("keeps a pasted name that is too long and flags it right away", async () => {
    const user = userEvent.setup();
    const onCreate = renderDialog();
    const name = "northwind-industries-holdings-customer-portal-production-eu";

    await user.click(screen.getByRole("button", { name: "New project" }));
    const input = await screen.findByLabelText("Project name");
    await user.click(input);
    await user.paste(name);

    expect(input).toHaveValue(name);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Use 48 characters or fewer.");
    await user.click(screen.getByRole("button", { name: "Create project" }));
    expect(onCreate).not.toHaveBeenCalled();
    expect(input).toHaveFocus();
  });
});
