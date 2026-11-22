import React, {
  forwardRef,
  useRef,
  useState,
  type FormEvent,
  type TextareaHTMLAttributes,
} from "react";
import { useFieldControl } from "@/components/ui/field-context";

const FieldTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function FieldTextarea(props, ref) {
    const field = useFieldControl();
    return (
      <textarea
        ref={ref}
        id={field?.id}
        aria-describedby={field?.describedBy}
        aria-invalid={field?.invalid || undefined}
        required={field?.required}
        {...props}
      />
    );
  },
);
import {
  AppWindow,
  Clock,
  Cpu,
  Database,
  MemoryStick,
  Server,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Select } from "./Select";
import type { AddedService } from "./storage";
import { fill } from "./text";
import { SERVICE_KINDS, type CanvasDomain, type CanvasService, type ServiceKind } from "./types";
import {
  SERVICE_NAME_MAX_LENGTH,
  SOURCE_MAX_LENGTH,
  validateServiceName,
  validateSource,
} from "./validation";

/** The entry point for adding to the canvas: "repo" | "docker" | "domain". */
export type AddKind = "repo" | "docker" | "domain";

const KIND_ICONS: Record<ServiceKind, LucideIcon> = {
  web: AppWindow,
  service: Server,
  worker: Cpu,
  cron: Clock,
  database: Database,
  cache: MemoryStick,
};

/**
 * Modal for adding a service (repository or Docker image) or a domain. Opens in a
 * specific mode — no tab switching inside. Right-clicking or the add button both
 * use this, with the mode pre-set by the caller's menu selection.
 */
export function AddServiceDialog({
  open,
  kind,
  existingNames,
  services,
  domainNames,
  onOpenChange,
  onAdd,
  onAddDomain,
  onCloseAutoFocus,
}: {
  open: boolean;
  /** Determines which form is shown — set once when the dialog opens. */
  kind: AddKind | null;
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
  const contentRef = useRef<HTMLDivElement>(null);

  const title = kind === "repo" ? a.titleRepo : kind === "docker" ? a.titleDocker : d.addTitle;
  const description =
    kind === "repo"
      ? a.descriptionRepo
      : kind === "docker"
        ? a.descriptionDocker
        : d.addDescription;

  return (
    <Dialog open={open && kind !== null} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        closeLabel={a.close}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          contentRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
        }}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {kind === "domain" && (
          <DomainForm
            services={services}
            domainNames={domainNames}
            onAdd={(domain) => {
              onAddDomain(domain);
              onOpenChange(false);
            }}
          />
        )}

        {(kind === "repo" || kind === "docker") && (
          <ServiceForm
            key={kind}
            sourceType={kind === "repo" ? "repo" : "image"}
            allowDockerSourceToggle={kind === "docker"}
            existingNames={existingNames}
            onAdd={(service) => {
              onAdd(service);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ServiceForm({
  sourceType: initialSourceType,
  allowDockerSourceToggle,
  existingNames,
  onAdd,
}: {
  sourceType: "repo" | "image";
  allowDockerSourceToggle?: boolean;
  existingNames: readonly string[];
  onAdd: (service: AddedService) => void;
}) {
  const a = useI18n().project.add;
  const c = useI18n().project.canvas;
  const [dockerSource, setDockerSource] = useState<"image" | "dockerfile">("image");
  const sourceType = allowDockerSourceToggle ? dockerSource : initialSourceType;
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ServiceKind>(initialSourceType === "image" ? "service" : "web");
  const [source, setSource] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

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

  const kindOptions = SERVICE_KINDS.map((value) => ({
    value,
    label: c.kinds[value],
    icon: (() => {
      const Icon = KIND_ICONS[value];
      return <Icon size={13} strokeWidth={1.5} />;
    })(),
  }));

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

        <Select<ServiceKind> label={a.type} value={kind} options={kindOptions} onChange={setKind} />

        {allowDockerSourceToggle && (
          <div className="flex items-center gap-1 rounded-md border border-input p-0.5">
            <button
              type="button"
              onClick={() => {
                setDockerSource("image");
                setSource("");
                setSubmitted(false);
              }}
              className={cn(
                "flex-1 rounded py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                dockerSource === "image"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {a.dockerSourceImage}
            </button>
            <button
              type="button"
              onClick={() => {
                setDockerSource("dockerfile");
                setSource("");
                setSubmitted(false);
              }}
              className={cn(
                "flex-1 rounded py-1 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                dockerSource === "dockerfile"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {a.dockerSourceDockerfile}
            </button>
          </div>
        )}

        <Field
          label={a.sourceLabel[sourceType]}
          description={a.sourceHint[sourceType]}
          error={submitted && sourceError ? sourceMessages[sourceError] : undefined}
          required
        >
          {sourceType === "dockerfile" ? (
            <FieldTextarea
              ref={sourceRef as React.RefObject<HTMLTextAreaElement>}
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder={a.sourcePlaceholder[sourceType]}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              rows={8}
              className="w-full resize-y rounded border border-input bg-transparent px-2 py-1.5 font-mono text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            />
          ) : (
            <Input
              ref={sourceRef as React.RefObject<HTMLInputElement>}
              size="sm"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder={a.sourcePlaceholder[sourceType]}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono coarse:h-10 coarse:text-base"
            />
          )}
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
