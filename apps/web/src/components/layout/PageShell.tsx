import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";

/**
 * Wordmark header plus a single-column main, for pages outside the dashboard.
 * Pages centre their content with `m-auto`: when it is taller than the viewport
 * (short screens, 200% zoom) the auto margins drop to 0 and the document scrolls.
 */
export function PageShell({ children }: { children: ReactNode }) {
  const t = useI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-background">
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
        className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-5 py-14 focus:outline-none sm:px-8 sm:py-20"
      >
        {children}
      </main>
    </div>
  );
}
