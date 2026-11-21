import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { useI18n } from "@/i18n";

/** Generic message only: never echo the requested path back into the page. */
export function NotFoundPage() {
  const { errors: e } = useI18n();
  return (
    <PageShell>
      <div className="m-auto w-full max-w-md text-center">
        <h1 className="text-balance font-display text-[2.25rem] font-light leading-[1.07] tracking-[-0.045em] text-foreground">
          {e.notFoundTitle}
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground">{e.notFound}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/dashboard">{e.toDashboard}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/login">{e.toSignIn}</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
