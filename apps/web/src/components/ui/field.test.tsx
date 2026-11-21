import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";
import { Input } from "./input";

describe("Field", () => {
  it("labels the input and links the description", () => {
    render(
      <Field label="Name" description="Lowercase letters only" required>
        <Input />
      </Field>,
    );

    const input = screen.getByLabelText("Name");
    expect(input).toHaveAccessibleDescription("Lowercase letters only");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("shows the error instead of the description and marks the input invalid", () => {
    render(
      <Field label="Name" description="Lowercase letters only" error="Name is taken">
        <Input />
      </Field>,
    );

    const input = screen.getByLabelText("Name");
    expect(screen.getByRole("alert")).toHaveTextContent("Name is taken");
    expect(screen.queryByText("Lowercase letters only")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Name is taken");
  });
});
