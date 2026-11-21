import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { useI18n } from "@/i18n";
import { NotFoundPage } from "./NotFoundPage";

/** Router errorElement. Shows no error details: they can leak internals. */
export function ErrorPage() {
  const error = useRouteError();
  const { errors: e } = useI18n();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <PageShell>
      <div className="max-w-md">
        <h1 className="text-balance font-display text-[2.25rem] font-light leading-[1.07] tracking-[-0.045em] text-foreground">
          {e.crashTitle}
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground">{e.crash}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" onClick={() => window.location.reload()}>
            {e.reload}
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">{e.toDashboard}</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
