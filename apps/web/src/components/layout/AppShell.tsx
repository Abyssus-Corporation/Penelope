import { useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Sidebar } from "./Sidebar";

/**
 * The dashboard frame: the same sidebar and 56px header bar as DashboardPage.
 * The sidebar and header stick while the page scrolls.
 */
export function AppShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* shortcut: no small-screen nav on main yet; #11's drawer replaces this hidden sidebar below md. */}
      <div className="sticky top-0 hidden h-screen md:flex">
        <Sidebar collapsed={collapsed} />
      </div>

      <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden size-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={15} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
          <div className="min-w-0 flex-1">{header}</div>
        </header>

        {/* The document scrolls, not an inner box, so arrow keys and the mobile URL bar behave natively. */}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
