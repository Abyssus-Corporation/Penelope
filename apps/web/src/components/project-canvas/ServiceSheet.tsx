import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { DialogOverlay } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { KindIcon, LastDeploy, ServiceSourceLine, ServiceStatusLabel } from "./service-parts";
import type { CanvasService } from "./types";

const TAB =
  "-mb-px border-b-2 border-transparent px-1 pb-2.5 pt-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=active]:text-foreground";
const PANEL =
  "px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

/**
 * Right-hand sheet for one service. Radix handles the focus trap, Esc and
 * scroll lock; the caller restores focus to the node via `onCloseAutoFocus`
 * because the sheet has no Radix trigger.
 */
export function ServiceSheet({
  open,
  service,
  onOpenChange,
  onCloseAutoFocus,
}: {
  open: boolean;
  /** Kept after close so the sheet can fade out with its content. */
  service: CanvasService | null;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const t = useI18n();
  const s = t.project.sheet;
  const c = t.project.canvas;

  return (
    <DialogPrimitive.Root open={open && service !== null} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        {service && (
          <DialogPrimitive.Content
            onCloseAutoFocus={onCloseAutoFocus}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background text-foreground shadow-xl focus:outline-none data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in"
          >
            <header className="flex items-start gap-3 border-b border-border px-5 pb-4 pr-14 pt-5">
              <KindIcon kind={service.kind} />
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-base font-medium leading-6 [overflow-wrap:anywhere]">
                  {service.name}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description asChild>
                  <div className="mt-1 space-y-1.5">
                    <ServiceSourceLine service={service} />
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-xs text-muted-foreground">{c.kinds[service.kind]}</span>
                      <ServiceStatusLabel service={service} />
                    </p>
                  </div>
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                aria-label={s.close}
                className="absolute right-3 top-4 flex size-9 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={16} strokeWidth={1.5} aria-hidden="true" />
              </DialogPrimitive.Close>
            </header>

            <Tabs.Root defaultValue="deployments" className="flex min-h-0 flex-1 flex-col">
              <Tabs.List
                aria-label={s.tabs}
                className="flex gap-5 border-b border-border px-5 pt-3"
              >
                <Tabs.Trigger value="deployments" className={TAB}>
                  {s.deployments}
                </Tabs.Trigger>
                <Tabs.Trigger value="variables" className={TAB}>
                  {s.variables}
                </Tabs.Trigger>
                <Tabs.Trigger value="settings" className={TAB}>
                  {s.settings}
                </Tabs.Trigger>
              </Tabs.List>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <Tabs.Content value="deployments" className={PANEL}>
                  <dl>
                    <Row label={s.lastDeploy}>
                      <LastDeploy service={service} className="text-sm text-foreground" />
                    </Row>
                  </dl>
                  <Placeholder>{s.deploymentsEmpty}</Placeholder>
                </Tabs.Content>
                <Tabs.Content value="variables" className={PANEL}>
                  <Placeholder>{s.variablesEmpty}</Placeholder>
                </Tabs.Content>
                <Tabs.Content value="settings" className={PANEL}>
                  <dl className="space-y-4">
                    <Row label={s.type}>{c.kinds[service.kind]}</Row>
                    <Row label={s.source}>
                      {service.source ? (
                        <>
                          <span className="text-muted-foreground">
                            {c.sources[service.source.type]} ·{" "}
                          </span>
                          <span className="[overflow-wrap:anywhere]">{service.source.label}</span>
                        </>
                      ) : (
                        c.noSource
                      )}
                    </Row>
                    <Row label={s.references}>
                      {service.references.length ? service.references.join(", ") : c.referencesNone}
                    </Row>
                  </dl>
                  <Placeholder>{s.settingsNote}</Placeholder>
                </Tabs.Content>
              </div>
            </Tabs.Root>
          </DialogPrimitive.Content>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
