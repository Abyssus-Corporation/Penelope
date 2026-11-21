import { useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";

const ICON_BUTTON =
  "flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

/** Below `md` the sidebar leaves the layout and opens as a modal drawer instead. */
function MobileNav() {
  const { nav } = useI18n().dashboard;
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        className={cn(ICON_BUTTON, "md:hidden")}
        aria-label={nav.openNavigation}
      >
        <Menu size={15} strokeWidth={1.5} aria-hidden="true" />
      </DialogPrimitive.Trigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // Radix makes the page outside inert but doesn't set aria-modal itself.
          aria-modal="true"
          onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
          className="fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-background shadow-xl focus:outline-none data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in"
        >
          <DialogPrimitive.Title className="sr-only">{nav.navigation}</DialogPrimitive.Title>
          {/* Sits on the overlay beside the panel, so it never covers sidebar controls. */}
          <DialogPrimitive.Close
            aria-label={nav.closeNavigation}
            className="absolute -right-10 top-3 flex size-8 items-center justify-center rounded bg-background text-foreground shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={15} strokeWidth={1.5} aria-hidden="true" />
          </DialogPrimitive.Close>
          <Sidebar collapsed={false} className="w-full" />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

/**
 * The dashboard frame: sidebar (a drawer below `md`) and a sticky header bar.
 * The header grows if its content wraps; the sidebar and header stick while the page scrolls.
 */
export function AppShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      <div className="sticky top-0 hidden h-dvh md:flex">
        <Sidebar collapsed={collapsed} />
      </div>

      <main id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
        {/*
          The hairline is drawn inside the header box (like the sidebar's h-14 border-box
          header), so a one-row header is exactly h-14 and both bottom borders share a pixel.
          A real border-b would sit below the h-14 rows and make it 57px.
        */}
        <header className="sticky top-0 z-10 flex shrink-0 items-start gap-3 bg-background px-4 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border">
          {/* Pinned to the first row when the header content wraps onto a second one. */}
          <div className="flex h-14 shrink-0 items-center">
            <MobileNav />
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={cn(ICON_BUTTON, "hidden md:flex")}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen size={15} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={15} strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="flex min-h-14 min-w-0 flex-1 items-center">{header}</div>
        </header>

        {/* The document scrolls, not an inner box, so arrow keys and the mobile URL bar behave natively. */}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
