import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  PROJECT_NAME_MAX_LENGTH,
  createProject,
  parseRepository,
  validateProjectName,
} from "@/lib/projects";
import type { Project } from "@/types/project";

interface CreateProjectDialogProps {
  /** Element that opens the dialog; focus returns to it on close. */
  trigger: ReactNode;
  existingProjects: readonly Project[];
  onCreate: (project: Project) => void;
}

export function CreateProjectDialog({
  trigger,
  existingProjects,
  onCreate,
}: CreateProjectDialogProps) {
  const { dashboard: d } = useI18n();
  const c = d.projects.create;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [repository, setRepository] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const repoRef = useRef<HTMLInputElement>(null);

  const nameError = validateProjectName(
    name,
    existingProjects.map((p) => p.name),
  );
  const repoInvalid = repository.trim() !== "" && parseRepository(repository) === null;

  const nameMessage = {
    required: c.errors.nameRequired,
    tooLong: c.errors.nameTooLong.replace("{max}", String(PROJECT_NAME_MAX_LENGTH)),
    invalid: c.errors.nameInvalid,
    taken: c.errors.nameTaken,
  } as const;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      setRepository("");
      setSubmitted(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (nameError) return nameRef.current?.focus();
    if (repoInvalid) return repoRef.current?.focus();

    const project = createProject({
      name,
      repository,
      deployedAt: c.justCreated,
      existingIds: existingProjects.map((p) => p.id),
    });
    onCreate(project);
    toast.success(c.success.replace("{name}", project.name));
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        closeLabel={c.close}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <form noValidate onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{c.title}</DialogTitle>
            <DialogDescription>{c.description}</DialogDescription>
          </DialogHeader>

          <DialogBody>
            <Field
              label={c.name}
              description={c.nameHint}
              error={submitted && nameError ? nameMessage[nameError] : undefined}
              required
            >
              <Input
                ref={nameRef}
                size="sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={c.namePlaceholder}
                autoComplete="off"
                spellCheck={false}
                maxLength={PROJECT_NAME_MAX_LENGTH + 16}
                className="font-mono"
              />
            </Field>

            <Field
              label={c.repository}
              description={c.repositoryHint}
              optionalLabel={c.optional}
              error={submitted && repoInvalid ? c.errors.repositoryInvalid : undefined}
            >
              <Input
                ref={repoRef}
                size="sm"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                placeholder={c.repositoryPlaceholder}
                autoComplete="off"
                spellCheck={false}
                inputMode="url"
                className="font-mono"
              />
            </Field>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                {c.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" size="sm">
              {c.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
