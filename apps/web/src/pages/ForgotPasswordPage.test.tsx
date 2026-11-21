import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api";
import { I18nProvider } from "@/i18n";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

vi.mock("@/api", () => ({ api: { auth: { requestPasswordReset: vi.fn() } } }));
const requestPasswordReset = vi.mocked(api.auth.requestPasswordReset);

function renderPage() {
  render(
    <I18nProvider>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </I18nProvider>,
  );
}

function submit(email: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    requestPasswordReset.mockReset();
  });

  it("shows the same message for any address, and never before the minimum delay", async () => {
    const messages: string[] = [];
    for (const email of ["ada@acme.com", "nobody@example.com"]) {
      // A real backend may answer at different speeds; the page must not.
      requestPasswordReset.mockResolvedValueOnce(undefined);
      renderPage();
      submit(email);
      expect(screen.getByRole("button", { name: "Sending…" })).toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(1100));
      expect(screen.queryByRole("heading", { name: "Check your email" })).toBeNull();

      await act(() => vi.advanceTimersByTimeAsync(200));
      expect(screen.getByRole("heading", { name: "Check your email" })).toHaveFocus();
      messages.push(
        screen.getByText(/If an account exists/).textContent!.replace(email, "{email}"),
      );
      cleanup();
    }
    expect(messages[0]).toBe(messages[1]);
    expect(requestPasswordReset).toHaveBeenNthCalledWith(1, "ada@acme.com");
    expect(requestPasswordReset).toHaveBeenNthCalledWith(2, "nobody@example.com");
  });

  it("shows only a generic error when the request fails", async () => {
    requestPasswordReset.mockRejectedValueOnce(new Error("503 from upstream"));
    renderPage();
    submit("ada@acme.com");
    await act(() => vi.advanceTimersByTimeAsync(1300));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong. Try again in a moment.",
    );
    expect(screen.queryByText(/503/)).toBeNull();
  });

  it("validates the address before sending", async () => {
    renderPage();
    submit("not-an-email");

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });
});
