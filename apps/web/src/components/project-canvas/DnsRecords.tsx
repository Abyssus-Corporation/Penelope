import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { DnsStatusBadge } from "./domain-parts";
import { dnsRecords, isApex } from "./domains";
import { fill } from "./text";
import { CHECK_MS, copyText } from "./clipboard";

/**
 * The records to add at the user's DNS provider for a custom domain: CNAME for a
 * subdomain, A + AAAA for an apex (heuristic, see domains.ts). Every host and value
 * has a copy button; "Check again" (sheet only) flips the mock DNS state.
 */
export function DnsRecords({
  hostname,
  verified,
  onCheck,
}: {
  hostname: string;
  /** Omitted in the add dialog, before the domain exists. */
  verified?: boolean;
  onCheck?: () => void;
}) {
  const d = useI18n().project.domain;
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const timer = useRef<number>();
  const copiedTimer = useRef<number>();
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(copiedTimer.current);
    },
    [],
  );
  const records = dnsRecords(hostname);

  async function copy(key: string, value: string, button: HTMLButtonElement) {
    const ok = await copyText(value, button.parentElement ?? document.body);
    setCopied(ok ? key : null);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(null), 2000);
    setMessage(ok ? fill(d.copied, { value }) : d.copyFailed);
  }

  function check() {
    setChecking(true);
    setMessage(d.checking);
    timer.current = window.setTimeout(() => {
      setChecking(false);
      onCheck?.();
      setMessage(fill(verified ? d.nowPending : d.nowVerified, { domain: hostname }));
    }, CHECK_MS);
  }

  const field = (key: string, label: string, value: string) => (
    <div className="flex items-center gap-2 py-1">
      <dt className="w-12 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 font-mono text-[12px] text-foreground [overflow-wrap:anywhere]">
        {value}
      </dd>
      <dd className="shrink-0">
        <button
          type="button"
          aria-label={fill(d.copy, { field: label.toLowerCase(), value })}
          title={fill(d.copy, { field: label.toLowerCase(), value })}
          onClick={(event) => void copy(key, value, event.currentTarget)}
          className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring coarse:size-10"
        >
          {copied === key ? (
            <Check size={13} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Copy size={13} strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      </dd>
    </div>
  );

  return (
    <section aria-label={d.dnsTitle} className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">{d.dnsTitle}</h3>
        {verified !== undefined && <DnsStatusBadge domain={{ verified }} />}
      </div>
      <p className="text-xs text-muted-foreground">
        {d.dnsIntro} {isApex(hostname) ? fill(d.dnsApex, { hostname }) : d.dnsSub}
      </p>
      <ul className="space-y-2">
        {records.map((record) => (
          <li
            key={record.type}
            className="rounded-md border border-border bg-background px-3 py-1.5"
          >
            <dl>
              <div className="flex items-center gap-2 py-1">
                <dt className="w-12 shrink-0 text-xs text-muted-foreground">{d.type}</dt>
                <dd className="font-mono text-[12px] font-medium text-foreground">{record.type}</dd>
              </div>
              {field(`${record.type}-host`, d.host, record.host)}
              {field(`${record.type}-value`, d.value, record.value)}
            </dl>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">{d.dnsPlaceholder}</p>
      {onCheck && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          // aria-disabled, not disabled: a disabled button would drop keyboard focus.
          onClick={() => !checking && check()}
          aria-disabled={checking}
          className="gap-1.5 coarse:h-10"
        >
          {checking ? (
            <Loader2
              size={13}
              strokeWidth={1.75}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <RefreshCw size={13} strokeWidth={1.5} aria-hidden="true" />
          )}
          {checking ? d.checking : d.checkAgain}
        </Button>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {message}
      </p>
    </section>
  );
}
