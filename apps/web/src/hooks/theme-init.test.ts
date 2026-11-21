import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// The pre-paint script and initTheme() must agree, or the page would flip themes on load.
const script = readFileSync(resolve(__dirname, "../../public/theme-init.js"), "utf8");

type Stored = string | null | "blocked";

function setup(stored: Stored, osDark: boolean) {
  document.documentElement.className = "";
  localStorage.clear();
  if (stored === "blocked") {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
  } else if (stored !== null) {
    localStorage.setItem("theme", stored);
  }
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: osDark && query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

const isDark = () => document.documentElement.classList.contains("dark");

const CASES: [Stored, boolean, boolean][] = [
  ["dark", false, true],
  ["light", true, false],
  ["system", true, true],
  ["system", false, false],
  ["purple", true, true], // invalid -> system
  ["purple", false, false],
  [null, true, true],
  ["blocked", true, true], // storage throws -> system
  ["blocked", false, false],
];

describe("theme-init.js and initTheme()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it.each(CASES)("stored %s, OS dark %s -> dark %s", async (stored, osDark, expected) => {
    setup(stored, osDark);
    // Runs the shipped file as-is (test-only; the app loads it with <script src>).
    new Function(script)();
    expect(isDark()).toBe(expected);

    document.documentElement.className = "";
    const { initTheme } = await import("./useTheme");
    initTheme();
    expect(isDark()).toBe(expected);
  });
});
