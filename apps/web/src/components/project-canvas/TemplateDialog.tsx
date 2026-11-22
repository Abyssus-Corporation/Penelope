import { useEffect, useRef, useState, type FormEvent } from "react";
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
import { Select } from "./Select";
import { fill } from "./text";
import type { ServiceTemplate } from "./templates";
import type { AddedService } from "./storage";
import { SERVICE_NAME_MAX_LENGTH, validateServiceName } from "./validation";

export function TemplateDialog({
  open,
  template,
  existingNames,
  defaultName,
  onAdd,
  onOpenChange,
  onCloseAutoFocus,
}: {
  open: boolean;
  template: ServiceTemplate | null;
  existingNames: readonly string[];
  /** Pre-filled name (unique-ified by the caller). */
  defaultName: string;
  onAdd: (service: AddedService) => void;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const t = useI18n();
  const a = t.project.add;
  const c = t.project.canvas;
  const tl = t.project.template;
  const contentRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(defaultName);
  const [version, setVersion] = useState(template?.versions[0]?.tag ?? "");
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens with a new template.
  useEffect(() => {
    if (open && template) {
      setName(defaultName);
      setVersion(template.versions[0]?.tag ?? "");
      setSubmitted(false);
    }
  }, [open, template, defaultName]);

  if (!template) return null;

  const nameError = validateServiceName(name, existingNames);
  const nameMessages = {
    required: a.errors.nameRequired,
    tooLong: fill(a.errors.nameTooLong, { max: SERVICE_NAME_MAX_LENGTH }),
    invalid: a.errors.nameInvalid,
    taken: a.errors.nameTaken,
  } as const;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (nameError) return nameRef.current?.focus();
    const trimmed = name.trim();
    onAdd({
      id: trimmed,
      name: trimmed,
      kind: template!.kind,
      source: { type: "image", label: version },
    });
    onOpenChange(false);
  }

  const versionOptions = template.versions.map((v) => ({ value: v.tag, label: v.label }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <DialogTitle>
            {fill(tl.title, {
              name: c.templateNames[template.id as keyof typeof c.templateNames] ?? template.name,
            })}
          </DialogTitle>
          <DialogDescription>{tl.description}</DialogDescription>
        </DialogHeader>

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
                placeholder={template.defaultName}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="font-mono coarse:h-10 coarse:text-base"
              />
            </Field>

            <Select
              label={tl.version}
              value={version}
              options={versionOptions}
              onChange={setVersion}
            />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                {a.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" size="sm">
              {fill(tl.add, {
                name: c.templateNames[template.id as keyof typeof c.templateNames] ?? template.name,
              })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
