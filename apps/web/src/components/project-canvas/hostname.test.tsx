import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hostname } from "./domain-parts";
import { hostnameLabels, labelsFit } from "./hostname";

describe("hostname display", () => {
  it("splits into labels, each keeping its trailing dot", () => {
    expect(hostnameLabels("shop-3f9a1c.penelope.local")).toEqual([
      "shop-3f9a1c.",
      "penelope.",
      "local",
    ]);
    expect(hostnameLabels("a.b.co.uk")).toEqual(["a.", "b.", "co.", "uk"]);
    expect(hostnameLabels("localhost")).toEqual(["localhost"]);
    expect(hostnameLabels("")).toEqual([]);
  });

  it("checks every label against the line length", () => {
    expect(labelsFit("shop-3f9a1c.penelope.local", 20)).toBe(true);
    expect(labelsFit(`${"a".repeat(30)}.example.com`, 20)).toBe(false);
    // The trailing dot counts: it renders on the label's line.
    expect(labelsFit(`${"a".repeat(20)}.com`, 20)).toBe(false);
  });

  it("renders one unbreakable span per label with a <wbr> after each dot only", () => {
    const { container } = render(<Hostname hostname="shop-3f9a1c.penelope.local" maxLabel={20} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("title", "shop-3f9a1c.penelope.local");
    expect(root).toHaveClass("break-normal");
    expect(root.textContent).toBe("shop-3f9a1c.penelope.local");
    const labels = Array.from(root.querySelectorAll("span"));
    expect(labels.map((span) => span.textContent)).toEqual(["shop-3f9a1c.", "penelope.", "local"]);
    expect(labels.every((span) => span.classList.contains("whitespace-nowrap"))).toBe(true);
    expect(root.querySelectorAll("wbr")).toHaveLength(2);
    // Each <wbr> directly follows a label that ends in a dot.
    for (const wbr of Array.from(root.querySelectorAll("wbr"))) {
      expect(wbr.previousSibling?.textContent?.endsWith(".")).toBe(true);
    }
  });

  it("falls back to one truncated line when a label can't fit, keeping the full name", () => {
    const long = `${"a".repeat(40)}.example.com`;
    const { container } = render(<Hostname hostname={long} maxLabel={20} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("truncate");
    expect(root).toHaveAttribute("title", long);
    expect(root.textContent).toBe(long);
    expect(root.querySelectorAll("wbr")).toHaveLength(0);
  });
});
