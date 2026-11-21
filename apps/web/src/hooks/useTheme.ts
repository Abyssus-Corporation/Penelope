import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem("theme");
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {}
  return "system";
}

// One theme for the whole app, so every page and every useTheme() caller agree.
let current: Theme = readStoredTheme();
const listeners = new Set<() => void>();

function applyTheme() {
  const dark = current === "dark" || (current === "system" && matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Applies the saved theme before the first render and follows OS changes while
 * the theme is "system". Called once from main.tsx: it runs for every route,
 * including the router's errorElement, which replaces the root layout.
 */
export function initTheme() {
  applyTheme();
  matchMedia(DARK_QUERY).addEventListener("change", () => current === "system" && applyTheme());
}

function setTheme(next: Theme) {
  current = next;
  applyTheme();
  try {
    localStorage.setItem("theme", next);
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  return { theme, setTheme };
}
