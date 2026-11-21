import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/layout/PageShell";
import { useI18n } from "@/i18n";

/**
 * Every request takes at least this long, so a fast "no such account" answer
 * from a future backend can't be told apart from a slow "email sent" one.
 */
const MIN_RESPONSE_MS = 1200;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Status = "idle" | "sending" | "sent" | "error";

export function ForgotPasswordPage() {
  const { forgotPassword: f } = useI18n();
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);
  const sentHeading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "sent") sentHeading.current?.focus();
  }, [status]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    if (!input.current?.checkValidity()) {
      setInvalid(true);
      input.current?.focus();
      return;
    }
    setInvalid(false);
    setStatus("sending");
    const [ok] = await Promise.all([
      api.auth.requestPasswordReset(email.trim()).then(
        () => true,
        () => false,
      ),
      wait(MIN_RESPONSE_MS),
    ]);
    setStatus(ok ? "sent" : "error");
  }

  function reset() {
    setEmail("");
    setStatus("idle");
    // The input mounts again on the next render.
    requestAnimationFrame(() => input.current?.focus());
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-sm lg:mx-0">
        <h1 className="text-balance font-display text-[2.25rem] font-light leading-[1.07] tracking-[-0.045em] sm:text-[2.6rem]">
          <span className="block text-foreground">{f.title}</span>
          <span className="block text-muted-foreground">{f.subtitle}</span>
        </h1>

        {status === "sent" ? (
          <div className="mt-10 space-y-4">
            <h2
              ref={sentHeading}
              tabIndex={-1}
              className="text-lg font-medium text-foreground focus:outline-none"
            >
              {f.sentTitle}
            </h2>
            <p className="break-words text-[15px] text-foreground">
              {f.sent.replace("{email}", email.trim())}
            </p>
            <p className="text-sm text-muted-foreground">{f.sentHint}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
              <Button type="button" variant="outline" onClick={reset}>
                {f.tryAgain}
              </Button>
              <Link
                to="/login"
                className="rounded text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {f.backToSignIn}
              </Link>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={onSubmit} className="mt-10 space-y-4">
            <Field label={f.email} required error={invalid ? f.emailInvalid : undefined}>
              <Input
                ref={input}
                type="email"
                name="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={f.emailPlaceholder}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>

            {status === "error" && (
              <p role="alert" className="text-sm text-destructive">
                {f.error}
              </p>
            )}

            <Button
              size="lg"
              className="w-full"
              type="submit"
              aria-disabled={status === "sending" || undefined}
            >
              {status === "sending" ? f.submitting : f.submit}
            </Button>

            <p className="text-sm">
              <Link
                to="/login"
                className="rounded font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {f.backToSignIn}
              </Link>
            </p>
          </form>
        )}
      </div>
    </PageShell>
  );
}
