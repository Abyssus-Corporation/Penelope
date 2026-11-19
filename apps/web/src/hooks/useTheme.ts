import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

function resolvedTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = resolvedTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {}
}

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem("theme");
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {}
  return "system";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function setTheme(next: Theme) {
    setThemeState(next);
    applyTheme(next);
  }

  return { theme, setTheme };
}
