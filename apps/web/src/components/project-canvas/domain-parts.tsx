import { Fragment } from "react";
import { Globe, Lock } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { hostnameLabels, labelsFit } from "./hostname";
import type { CanvasDomain } from "./types";

export function DomainIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground",
        className,
      )}
    >
      <Globe size={14} strokeWidth={1.5} />
    </span>
  );
}

const BADGE =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4";

/** "Verified" (generated, or custom once DNS checks out) or "Pending DNS" (mock). */
export function DnsStatusBadge({ domain }: { domain: Pick<CanvasDomain, "verified"> }) {
  const d = useI18n().project.domain;
  return (
    <span
      className={cn(
        BADGE,
        domain.verified
          ? "border-success/40 text-foreground"
          : "border-dashed border-muted-foreground/60 text-muted-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          domain.verified ? "bg-success" : "border border-muted-foreground",
        )}
      />
      {domain.verified ? d.verified : d.pending}
    </span>
  );
}

/** Automatic certificate (mock): "Issuing" until DNS is verified, then "Active". */
export function HttpsBadge({ domain }: { domain: Pick<CanvasDomain, "verified"> }) {
  const d = useI18n().project.domain;
  return (
    <span
      className={cn(
        BADGE,
        "border-border",
        domain.verified ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Lock size={10} strokeWidth={2} aria-hidden="true" />
      {domain.verified ? d.httpsActive : d.httpsIssuing}
    </span>
  );
}

/**
 * A hostname that wraps only after a dot: each label is a nowrap span (so it can't
 * break at a "-" either) followed by <wbr>. If any label is longer than `maxLabel`
 * characters it can't fit a line, so the whole name goes on one truncated line. The
 * full hostname stays in the text (accessible name) and in the title either way.
 */
export function Hostname({
  hostname,
  maxLabel,
  className,
}: {
  hostname: string;
  /** Characters of this text style that fit one line of the container. */
  maxLabel: number;
  className?: string;
}) {
  if (!labelsFit(hostname, maxLabel)) {
    return (
      <span title={hostname} className={cn("block truncate", className)}>
        {hostname}
      </span>
    );
  }
  return (
    <span title={hostname} className={cn("block break-normal", className)}>
      {hostnameLabels(hostname).map((label, index) => (
        <Fragment key={index}>
          <span className="whitespace-nowrap">{label}</span>
          {label.endsWith(".") && <wbr />}
        </Fragment>
      ))}
    </span>
  );
}
