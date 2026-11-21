import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { DnsRecords } from "./DnsRecords";
import { DnsStatusBadge, HttpsBadge } from "./domain-parts";
import { validatePort } from "./domains";
import { SELECT } from "./form-styles";
import { fill } from "./text";
import type { CanvasDomain, CanvasService } from "./types";
import type { DomainChange } from "./use-project-graph";

/** The domain sheet's body: routing (target, port), HTTPS, and DNS. */
export function DomainSettings({
  domain,
  services,
  onChange,
}: {
  domain: CanvasDomain;
  services: readonly CanvasService[];
  onChange: (id: string, change: DomainChange) => void;
}) {
  const d = useI18n().project.domain;
  const targetId = useId();
  const [port, setPort] = useState(String(domain.port));
  const [portTried, setPortTried] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const portRef = useRef<HTMLInputElement>(null);
  const portError = validatePort(port);

  function changeTarget(value: string) {
    onChange(domain.id, { target: value || null });
    setAnnouncement(
      value
        ? fill(d.targetChanged, { domain: domain.hostname, service: value })
        : fill(d.targetCleared, { domain: domain.hostname }),
    );
  }

  function savePort(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPortTried(true);
    if (portError) return portRef.current?.focus();
    const value = Number(port.trim());
    onChange(domain.id, { port: value });
    setPort(String(value));
    setAnnouncement(fill(d.portSaved, { port: value }));
  }

  return (
    <div className="space-y-6">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">{d.routing}</h3>
        <div className="space-y-1.5">
          <label htmlFor={targetId} className="text-[12px] font-medium text-foreground">
            {d.target}
          </label>
          <select
            id={targetId}
            value={domain.target ?? ""}
            onChange={(event) => changeTarget(event.target.value)}
            className={SELECT}
          >
            <option value="">{d.targetNone}</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
        <form noValidate onSubmit={savePort} className="flex items-start gap-2">
          <Field
            label={d.port}
            description={d.portHint}
            error={
              portError && portTried
                ? portError === "required"
                  ? d.errors.portRequired
                  : d.errors.portInvalid
                : undefined
            }
            required
            className="min-w-0 flex-1"
          >
            <Input
              ref={portRef}
              size="sm"
              value={port}
              onChange={(event) => setPort(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              className="font-mono coarse:h-10 coarse:text-base"
            />
          </Field>
          <Button type="submit" size="sm" variant="outline" className="mt-6 coarse:h-10">
            {d.savePort}
          </Button>
        </form>
      </section>

      <section className="space-y-2 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">{d.https}</h3>
          <HttpsBadge domain={domain} />
        </div>
        <p className="text-xs text-muted-foreground">{d.httpsAuto}</p>
      </section>

      <div className="border-t border-border pt-5">
        {domain.type === "custom" ? (
          <DnsRecords
            hostname={domain.hostname}
            verified={domain.verified}
            onCheck={() => onChange(domain.id, { verified: !domain.verified })}
          />
        ) : (
          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">{d.dnsTitle}</h3>
              <DnsStatusBadge domain={domain} />
            </div>
            <p className="text-xs text-muted-foreground">{d.dnsGenerated}</p>
          </section>
        )}
      </div>
    </div>
  );
}
