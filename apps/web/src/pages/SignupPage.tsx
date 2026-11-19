import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

// ─── Password rules ───────────────────────────────────────────────────────────

const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { id: "number", label: "One number", test: (v: string) => /[0-9]/.test(v) },
  { id: "special", label: "One special character", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

function isPasswordValid(v: string) {
  return PASSWORD_RULES.every((r) => r.test(v));
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep1(name: string, email: string, password: string): string | null {
  if (!name.trim()) return "Full name is required.";
  if (!email.trim()) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  if (!password) return "Password is required.";
  if (!isPasswordValid(password)) return "Password doesn't meet all requirements.";
  return null;
}

function validateStep2(username: string, instanceName: string): string | null {
  if (!username.trim()) return "Username is required.";
  if (username.length < 3) return "Username must be at least 3 characters.";
  if (!/^[a-zA-Z0-9_-]+$/.test(username))
    return "Username can only contain letters, numbers, hyphens and underscores.";
  if (!instanceName.trim()) return "Instance name is required.";
  if (instanceName.trim().length < 2) return "Instance name must be at least 2 characters.";
  return null;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function RequiredMark() {
  return (
    <span className="ml-0.5 text-destructive" aria-hidden="true">
      *
    </span>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="sr-only">
        Step {current} of {total}
      </span>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i + 1 === current
              ? "w-6 bg-foreground"
              : i + 1 < current
                ? "w-3 bg-foreground/30"
                : "w-3 bg-border",
          )}
        />
      ))}
    </div>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <h1 className="text-balance font-display text-[2.25rem] font-light leading-[1.07] tracking-[-0.045em] sm:text-[2.6rem]">
      <span className="block text-foreground">{title}</span>
      <span className="block text-muted-foreground">{subtitle}</span>
    </h1>
  );
}

// Password checklist — shown once user starts typing, errors appear only after a submit attempt
function PasswordChecklist({ value, showErrors }: { value: string; showErrors: boolean }) {
  if (!value) return null;
  return (
    <ul
      aria-live="polite"
      aria-atomic="false"
      className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5"
    >
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        const isError = showErrors && !met;
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              met ? "text-success" : isError ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {met ? (
              <Check className="size-3 shrink-0" aria-hidden="true" />
            ) : (
              <X className="size-3 shrink-0" aria-hidden="true" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;
type Direction = "forward" | "back";

// ─── Side panel ───────────────────────────────────────────────────────────────

const FEATURES = [
  { label: "Deploy any service", sub: "Git-push to production in seconds" },
  { label: "Scale automatically", sub: "Zero-config horizontal scaling" },
  { label: "Monitor everything", sub: "Logs, metrics and alerts in one place" },
  { label: "Full team access", sub: "Roles, permissions and audit logs" },
] as const;

function SignupSidePanel() {
  return (
    <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl bg-card p-10">
      <div>
        <p className="text-balance font-display text-[2rem] font-light leading-[1.1] tracking-[-0.04em]">
          <span className="block text-foreground">Your platform,</span>
          <span className="block text-muted-foreground">your rules.</span>
        </p>
      </div>

      <div>
        <p className="mb-4 text-xs font-medium text-muted-foreground">What you get</p>
        <ul className="space-y-4">
          {FEATURES.map((f, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-[3px] size-1.5 shrink-0 rounded-full bg-success" />
              <div>
                <p className="text-sm font-medium leading-tight text-foreground">{f.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{f.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SignupPage() {
  const t = useI18n();
  const s = t.auth.signup;
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState<Direction>("forward");

  // Step 1 fields
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step1Attempted, setStep1Attempted] = useState(false);

  // Step 2 fields
  const [instanceName, setInstanceName] = useState("");
  const [instanceDesc, setInstanceDesc] = useState("");

  function advance() {
    setDirection("forward");
    setStep((prev) => Math.min(prev + 1, 3) as Step);
  }

  function back() {
    setDirection("back");
    setStep((prev) => Math.max(prev - 1, 1) as Step);
  }

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setStep1Attempted(true);
    const error = validateStep1(name, email, password);
    if (error) {
      toast.error(error);
      return;
    }
    advance();
  }

  function handleStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    const error = validateStep2(username, instanceName);
    if (error) {
      toast.error(error);
      return;
    }
    advance();
  }

  const animClass = direction === "forward" ? "animate-step-forward" : "animate-step-back";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <span className="text-[15px] font-medium tracking-tight text-foreground">
            {t.brand.name}
          </span>
          <p className="text-sm text-muted-foreground">
            {s.hasAccount}{" "}
            <Link
              to="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {s.signIn}
            </Link>
          </p>
        </div>
      </header>

      {/* Main — two-column grid matching Login */}
      <main className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-12 overflow-x-hidden px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        {/* ── Left: multi-step form ── */}
        <div className="mx-auto w-full max-w-sm lg:mx-0">
          {/* ── Step 1 — account ── */}
          {step === 1 && (
            <div key="step-1" className={cn("space-y-8", animClass)}>
              <div className="space-y-5">
                <StepDots current={1} total={3} />
                <StepHeading title={s.account.title} subtitle={s.account.subtitle} />
              </div>

              <form onSubmit={handleStep1Submit} noValidate className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-sm font-medium text-foreground">
                      {s.account.name}
                      <RequiredMark />
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder={s.account.namePlaceholder}
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium text-foreground">
                      {s.account.email}
                      <RequiredMark />
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={s.account.emailPlaceholder}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                      {s.account.password}
                      <RequiredMark />
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={s.account.passwordPlaceholder}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <PasswordChecklist value={password} showErrors={step1Attempted} />
                  </div>
                </div>

                <Button size="lg" className="w-full" type="submit">
                  {s.account.next}
                </Button>
              </form>
            </div>
          )}

          {/* ── Step 2 — instance ── */}
          {step === 2 && (
            <div key="step-2" className={cn("space-y-8", animClass)}>
              <div className="space-y-5">
                <StepDots current={2} total={3} />
                <StepHeading title={s.instance.title} subtitle={s.instance.subtitle} />
              </div>

              <form onSubmit={handleStep2Submit} noValidate className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="username" className="text-sm font-medium text-foreground">
                      {s.account.username}
                      <RequiredMark />
                    </label>
                    <Input
                      id="username"
                      type="text"
                      placeholder={s.account.usernamePlaceholder}
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="instance-name" className="text-sm font-medium text-foreground">
                      {s.instance.name}
                      <RequiredMark />
                    </label>
                    <Input
                      id="instance-name"
                      type="text"
                      placeholder={s.instance.namePlaceholder}
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="instance-desc" className="text-sm font-medium text-foreground">
                      {s.instance.description}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </label>
                    <Input
                      id="instance-desc"
                      type="text"
                      placeholder={s.instance.descriptionPlaceholder}
                      value={instanceDesc}
                      onChange={(e) => setInstanceDesc(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Button size="lg" className="w-full" type="submit">
                    {s.instance.next}
                  </Button>
                  <button
                    type="button"
                    onClick={back}
                    className="flex w-full items-center justify-center gap-1.5 rounded py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                    {s.instance.back}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Step 3 — done ── */}
          {step === 3 && (
            <div key="step-3" className={cn("space-y-8", animClass)}>
              <div className="space-y-5">
                <StepDots current={3} total={3} />
                <StepHeading title={s.done.title} subtitle={s.done.subtitle} />
              </div>

              <div className="space-y-5">
                <div className="space-y-3 rounded-xl border border-border bg-card p-5">
                  <Row label="Admin" value={email} />
                  <Row label="Username" value={`@${username}`} />
                  <Row label="Instance" value={instanceName} />
                  {instanceDesc && <Row label="Description" value={instanceDesc} />}
                </div>

                <Button size="lg" className="w-full" onClick={() => navigate("/dashboard")}>
                  <Check className="size-4" aria-hidden="true" />
                  {s.done.cta}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: side panel (decorative) ── */}
        <div
          className="relative hidden aspect-[4/3.6] animate-rise [animation-delay:120ms] lg:block"
          aria-hidden="true"
        >
          <SignupSidePanel />
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="truncate text-sm text-foreground">{value}</span>
    </div>
  );
}
