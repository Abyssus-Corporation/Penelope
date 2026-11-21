// Applies the saved theme before first paint. index.html loads this as a blocking,
// same-origin <script src> in <head>, so it passes `script-src 'self'` with no
// inline script. The rules must match initTheme() in src/hooks/useTheme.ts;
// src/hooks/theme-init.test.ts runs both against the same cases.
(() => {
  let theme = "system";
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark" || saved === "system") theme = saved;
  } catch {
    // Storage blocked (privacy mode, sandboxed frame): fall back to the OS setting.
  }
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
})();
