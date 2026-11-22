import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { Select } from "./Select";
import { DnsRecords } from "./DnsRecords";
import { Hostname } from "./domain-parts";
import {
  DEFAULT_PORT,
  GENERATED_SUFFIX,
  generateLabel,
  generatedHostname,
  normalizeHostname,
  validateLabel,
} from "./domains";
import { fill } from "./text";
import type { CanvasDomain, CanvasService, DomainType } from "./types";

/**
 * The Domain tab of the add dialog. Generated: "<service>-<hash>.penelope.local",
 * editable subdomain, target required, verified at once. Custom: any hostname the user
 * owns, normalized to punycode, target optional, with the DNS records to set.
 */
export function DomainForm({
  services,
  domainNames,
  onAdd,
}: {
  services: readonly CanvasService[];
  domainNames: readonly string[];
  onAdd: (domain: CanvasDomain) => void;
}) {
  const a = useI18n().project.add;
  const d = useI18n().project.domain;
  const canGenerate = services.length > 0;
  const [type, setType] = useState<DomainType>(canGenerate ? "generated" : "custom");
  const [target, setTarget] = useState(services[0]?.id ?? "");
  // A generated domain needs a target, so the first service is preselected; a custom
  // one starts unlinked unless the user picked a service themselves.
  const [targetPicked, setTargetPicked] = useState(false);
  const [label, setLabel] = useState(() => generateLabel(services[0]?.id ?? "app"));
  const [labelEdited, setLabelEdited] = useState(false);
  const [raw, setRaw] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const labelRef = useRef<HTMLInputElement>(null);
  const hostRef = useRef<HTMLInputElement>(null);
  const targetId = useId();
  const targetHintId = useId();
  const targetErrorId = useId();

  const generated = generatedHostname(label);
  const labelError =
    validateLabel(label) ?? (domainNames.includes(generated) ? ("taken" as const) : null);
  const custom = normalizeHostname(raw, domainNames);
  const targetError = type === "generated" && !target ? "required" : null;
  const showPunycode =
    !custom.error && custom.hostname !== raw.trim().toLowerCase().replace(/\.$/, "");

  const labelMessages = {
    required: d.errors.subdomainRequired,
    tooLong: d.errors.subdomainTooLong,
    invalid: d.errors.subdomainInvalid,
    taken: d.errors.subdomainTaken,
  } as const;

  function changeTarget(value: string) {
    setTarget(value);
    setTargetPicked(true);
    // Follow the service until the user edits the subdomain themselves.
    if (!labelEdited && value) setLabel(generateLabel(value));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (type === "generated") {
      if (targetError) return;
      if (labelError) return labelRef.current?.focus();
      return onAdd({
        id: generated,
        hostname: generated,
        type,
        target,
        port: DEFAULT_PORT,
        verified: true,
      });
    }
    if (custom.error) return hostRef.current?.focus();
    onAdd({
      id: custom.hostname,
      hostname: custom.hostname,
      type,
      target: target || null,
      port: DEFAULT_PORT,
      verified: false,
    });
  }

  const showTargetError = submitted && targetError;

  return (
    <form noValidate onSubmit={handleSubmit}>
      <DialogBody className="pt-4">
        <fieldset className="space-y-1.5">
          <legend className="text-[12px] font-medium text-foreground">{d.kindLegend}</legend>
          <div className="flex flex-col gap-1.5 pt-0.5">
            {(["generated", "custom"] as const).map((value) => (
              <label
                key={value}
                className="flex min-h-6 cursor-pointer items-center gap-2 text-[13px] text-foreground has-[:disabled]:cursor-not-allowed has-[:disabled]:text-muted-foreground coarse:min-h-10"
              >
                <input
                  type="radio"
                  name="domain-type"
                  value={value}
                  checked={type === value}
                  disabled={value === "generated" && !canGenerate}
                  onChange={() => {
                    setType(value);
                    setSubmitted(false);
                    if (!targetPicked) setTarget(value === "custom" ? "" : (services[0]?.id ?? ""));
                  }}
                  data-autofocus={type === value ? "" : undefined}
                  className="size-4 accent-primary"
                />
                {value === "generated" ? d.kindGenerated : d.kindCustom}
              </label>
            ))}
          </div>
        </fieldset>

        {type === "custom" && (
          <Field
            label={d.hostname}
            description={
              showPunycode ? fill(d.punycode, { hostname: custom.hostname }) : d.hostnameHint
            }
            error={submitted && custom.error ? d.errors[custom.error] : undefined}
            required
          >
            <Input
              ref={hostRef}
              size="sm"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder={d.hostnamePlaceholder}
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono coarse:h-10 coarse:text-base"
            />
          </Field>
        )}

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={targetId} className="text-[12px] font-medium text-foreground">
              {d.target}
            </label>
            {type === "custom" && (
              <span className="text-[11px] text-muted-foreground">{a.optional}</span>
            )}
          </div>
          <Select
            id={targetId}
            value={target}
            options={[
              ...(type === "custom" || !target ? [{ value: "", label: d.targetNone }] : []),
              ...services.map((service) => ({ value: service.id, label: service.name })),
            ]}
            onChange={changeTarget}
          />
          {showTargetError ? (
            <p id={targetErrorId} role="alert" className="text-[12px] text-destructive">
              {d.errors.targetRequired}
            </p>
          ) : (
            <p id={targetHintId} className="text-[12px] text-muted-foreground">
              {d.targetHint}
            </p>
          )}
        </div>

        {type === "generated" && (
          <Field
            label={d.subdomain}
            description={d.subdomainHint}
            error={
              labelError && (submitted || labelError === "tooLong")
                ? labelMessages[labelError]
                : undefined
            }
            required
          >
            <SuffixInput
              inputRef={labelRef}
              value={label}
              onChange={(value) => {
                setLabel(value);
                setLabelEdited(true);
              }}
            />
          </Field>
        )}

        {type === "generated" && !labelError && (
          <div className="text-[12px] text-muted-foreground">
            <p>{d.preview}</p>
            {/* 12px mono in the 440px dialog at 320: ~36 characters per line. */}
            <Hostname hostname={generated} maxLabel={36} className="font-mono text-foreground" />
          </div>
        )}

        {type === "custom" && !custom.error && <DnsRecords hostname={custom.hostname} />}
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="sm">
            {a.cancel}
          </Button>
        </DialogClose>
        <Button type="submit" size="sm">
          {d.submit}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** The subdomain input with the fixed ".penelope.local" shown after it. */
function SuffixInput({
  inputRef,
  value,
  onChange,
}: {
  inputRef: React.Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        ref={inputRef}
        size="sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className="min-w-0 flex-1 font-mono coarse:h-10 coarse:text-base"
      />
      <span aria-hidden="true" className="shrink-0 font-mono text-[12px] text-muted-foreground">
        .{GENERATED_SUFFIX}
      </span>
    </div>
  );
}
