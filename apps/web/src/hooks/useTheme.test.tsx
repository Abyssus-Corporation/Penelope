import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTheme } from "./useTheme";

function Probe({ name }: { name: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <button type="button" onClick={() => setTheme("dark")}>
      {name}:{theme}
    </button>
  );
}

describe("useTheme", () => {
  it("shares one theme across callers, applies it and saves it", () => {
    render(
      <>
        <Probe name="a" />
        <Probe name="b" />
      </>,
    );
    act(() => screen.getByText(/^a:/).click());

    expect(screen.getByText("b:dark")).toBeInTheDocument();
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
