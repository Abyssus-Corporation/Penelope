import { useId, useRef, useState, type FormEvent } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { DomainForm } from "./DomainForm";
import { SELECT } from "./form-styles";
import type { AddedService } from "./storage";
import { fill } from "./text";
import {
  SERVICE_KINDS,
  SOURCE_TYPES,
  type CanvasDomain,
  type CanvasService,
  type ServiceKind,
  type ServiceSourceType,
} from "./types";
import {
  SERVICE_NAME_MAX_LENGTH,
  SOURCE_MAX_LENGTH,
  validateServiceName,
  validateSource,
} from "./validation";

const TAB =
  "-mb-px border-b-2 border-transparent px-1 pb-2 pt-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=active]:text-foreground coarse:pb-3";

export type AddKind = "service" | "domain";

/**
 * Add to the canvas: a service or a domain (tabs; the toolbar menu picks the first
 * tab, right-click opens on Service). Errors show after the first submit, focus goes
 * to the first invalid field, and Radix keeps focus inside until the dialog closes.
 * Each form's state lives in its tab, so closing the dialog resets it.
 */
export function AddServiceDialog({
  open,
  initialKind = "service",
  existingNames,
  services,
  domainNames,
  onOpenChange,
  onAdd,
  onAddDomain,
  onCloseAutoFocus,
}: {
  open: boolean;
  initialKind?: AddKind;
  existingNames: readonly string[];
  services: readonly CanvasService[];
  domainNames: readonly string[];
  onOpenChange: (open: boolean) => void;
  onAdd: (service: AddedService) => void;
  onAddDomain: (domain: CanvasDomain) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const t = useI18n();
  const a = t.project.add;
  const d = t.project.domain;
  const [kind, setKind] = useState<AddKind>(initialKind);
  const [openedWith, setOpenedWith] = useState<{ open: boolean; kind: AddKind }>({
    open,
    kind: initialKind,
  });
  // Each opening starts on the tab the caller asked for.
  if (openedWith.open !== open || (open && openedWith.kind !== initialKind)) {
    setOpenedWith({ open, kind: initialKind });
    if (open) setKind(initialKind);
  }
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        closeLabel={a.close}
        // Taller than a 1280×800 screen at 200% zoom (400px): scroll inside, never clip.
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{kind === "service" ? a.title : d.addTitle}</DialogTitle>
          <DialogDescription>
            {kind === "service" ? a.description : d.addDescription}
          </DialogDescription>
        </DialogHeader>
        <Tabs.Root value={kind} onValueChange={(value) => setKind(value as AddKind)}>
          <Tabs.List aria-label={a.kinds} className="flex gap-5 border-b border-border px-5">
            <Tabs.Trigger value="service" className={TAB}>
              {a.tabService}
            </Tabs.Trigger>
            <Tabs.Trigger value="domain" className={TAB}>
              {a.tabDomain}
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="service" className="focus-visible:outline-none">
            <ServiceForm
              existingNames={existingNames}
              onAdd={(service) => {
                onAdd(service);
                onOpenChange(false);
              }}
            />
          </Tabs.Content>
          <Tabs.Content value="domain" className="focus-visible:outline-none">
            <DomainForm
              services={services}
              domainNames={domainNames}
              onAdd={(domain) => {
                onAddDomain(domain);
                onOpenChange(false);
              }}
            />
          </Tabs.Content>
        </Tabs.Root>
      </DialogContent>
    </Dialog>
  );
}

function ServiceForm({
  existingNames,
  onAdd,
}: {
  existingNames: readonly string[];
  onAdd: (service: AddedService) => void;
}) {
  const a = useI18n().project.add;
  const c = useI18n().project.canvas;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ServiceKind>("service");
  const [sourceType, setSourceType] = useState<ServiceSourceType>("repo");
  const [source, setSource] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLInputElement>(null);
  const typeId = useId();

  const nameError = validateServiceName(name, existingNames);
  const sourceError = validateSource(sourceType, source);
  const nameMessages = {
    required: a.errors.nameRequired,
    tooLong: fill(a.errors.nameTooLong, { max: SERVICE_NAME_MAX_LENGTH }),
    invalid: a.errors.nameInvalid,
    taken: a.errors.nameTaken,
  } as const;
  const sourceMessages = {
    required: a.errors.sourceRequired,
    tooLong: fill(a.errors.sourceTooLong, { max: SOURCE_MAX_LENGTH }),
    invalid: a.errors.sourceInvalid[sourceType],
  } as const;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (nameError) return nameRef.current?.focus();
    if (sourceError) return sourceRef.current?.focus();
    const trimmed = name.trim();
    onAdd({ id: trimmed, name: trimmed, kind, source: { type: sourceType, label: source.trim() } });
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <DialogBody className="pt-4">
        <Field
          label={a.name}
          description={fill(a.nameHint, { max: SERVICE_NAME_MAX_LENGTH })}
          error={
            nameError && (submitted || nameError === "tooLong")
              ? nameMessages[nameError]
              : undefined
          }
          required
        >
          <Input
            ref={nameRef}
            data-autofocus
            size="sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={a.namePlaceholder}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="font-mono coarse:h-10 coarse:text-base"
          />
        </Field>

        <div className="space-y-1.5">
          <label htmlFor={typeId} className="text-[12px] font-medium text-foreground">
            {a.type}
          </label>
          <select
            id={typeId}
            value={kind}
            onChange={(event) => setKind(event.target.value as ServiceKind)}
            className={SELECT}
          >
            {SERVICE_KINDS.map((value) => (
              <option key={value} value={value}>
                {c.kinds[value]}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-[12px] font-medium text-foreground">{a.source}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-0.5">
            {SOURCE_TYPES.map((value) => (
              <label
                key={value}
                className="flex min-h-6 cursor-pointer items-center gap-2 text-[13px] text-foreground coarse:min-h-10"
              >
                <input
                  type="radio"
                  name="source-type"
                  value={value}
                  checked={sourceType === value}
                  onChange={() => setSourceType(value)}
                  className="size-4 accent-primary"
                />
                {c.sources[value]}
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label={a.sourceLabel[sourceType]}
          description={a.sourceHint[sourceType]}
          error={submitted && sourceError ? sourceMessages[sourceError] : undefined}
          required
        >
          <Input
            ref={sourceRef}
            size="sm"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder={a.sourcePlaceholder[sourceType]}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="font-mono coarse:h-10 coarse:text-base"
          />
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="sm">
            {a.cancel}
          </Button>
        </DialogClose>
        <Button type="submit" size="sm">
          {a.submit}
        </Button>
      </DialogFooter>
    </form>
  );
}
