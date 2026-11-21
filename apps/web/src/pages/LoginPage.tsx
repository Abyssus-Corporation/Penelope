import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";

// ─── Side panel ──────────────────────────────────────────────────────────────

const DEPLOY_LOG = [
  { service: "web", message: "Build complete", ago: "2m ago", ok: true },
  { service: "api", message: "Deployed to prod", ago: "8m ago", ok: true },
  { service: "worker", message: "Scaled to 2 replicas", ago: "41m ago", ok: true },
  { service: "redis", message: "Restarted", ago: "2h ago", ok: true },
  { service: "postgres", message: "Backup complete", ago: "6h ago", ok: true },
] as const;

function SidePanel() {
  return (
    <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl bg-card p-10">
      {/* Top: statement */}
      <div>
        <p className="text-balance font-display text-[2rem] font-light leading-[1.1] tracking-[-0.04em]">
          <span className="block text-foreground">Your infrastructure,</span>
          <span className="block text-muted-foreground">without the overhead.</span>
        </p>
      </div>

      {/* Bottom: deploy log */}
      <div>
        <p className="mb-4 text-xs font-medium text-muted-foreground">Recent activity</p>
        <ul className="space-y-3">
          {DEPLOY_LOG.map((entry, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="size-1.5 shrink-0 rounded-full bg-success" />
              <span className="w-20 shrink-0 text-sm font-medium text-foreground">
                {entry.service}
              </span>
              <span className="flex-1 truncate text-sm text-muted-foreground">{entry.message}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {entry.ago}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LoginPage() {
  const t = useI18n();
  const a = t.auth.login;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header — just the wordmark */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-5 sm:px-8">
          <span className="text-[15px] font-medium tracking-tight text-foreground">
            {t.brand.name}
          </span>
        </div>
      </header>

      {/* Main — two-column grid matching Signup */}
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-12 px-5 py-14 outline-none sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-14"
      >
        {/* ── Left: form ── */}
        <div className="mx-auto w-full max-w-sm animate-rise lg:mx-0">
          <h1
            id="login-heading"
            className="text-balance font-display text-[2.25rem] font-light leading-[1.07] tracking-[-0.045em] sm:text-[2.6rem]"
          >
            <span className="block text-foreground">Sign in,</span>
            <span className="block text-muted-foreground">welcome back.</span>
          </h1>

          <div className="mt-10 space-y-5">
            <form aria-labelledby="login-heading" className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  {a.email}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder={a.emailPlaceholder}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    {a.password}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {a.forgotPassword}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={a.passwordPlaceholder}
                  autoComplete="current-password"
                  required
                />
              </div>

              <Button size="lg" className="w-full" type="submit">
                {a.submit}
              </Button>
            </form>

            <p className="text-sm text-muted-foreground">
              {a.noAccount}{" "}
              <Link
                to="/signup"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {a.signUp}
              </Link>
            </p>
          </div>
        </div>

        {/* ── Right: side panel (decorative) ── */}
        <div
          className="relative hidden aspect-[4/3.6] animate-rise [animation-delay:120ms] lg:block"
          aria-hidden="true"
        >
          <SidePanel />
        </div>
      </main>
    </div>
  );
}
