import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/i18n";

/** Wordmark header plus a single-column main, for pages outside the dashboard. */
export function PageShell({ children }: { children: ReactNode }) {
  const t = useI18n();
  // Applies the stored theme; without it these pages stay light until the dashboard mounts.
  useTheme();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-5 sm:px-8">
          <Link
            to="/"
            className="rounded text-[15px] font-medium tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t.brand.name}
          </Link>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-10 focus:outline-none sm:px-8 sm:py-16"
      >
        {children}
      </main>
    </div>
  );
}
