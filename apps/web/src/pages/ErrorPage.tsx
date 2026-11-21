import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { SkipLink } from "@/components/layout/RootLayout";
import { useI18n } from "@/i18n";
import { NotFoundPage } from "./NotFoundPage";

/**
 * Router errorElement. It replaces RootLayout, so it renders the skip link itself.
 * Shows no error details: they can leak internals.
 */
export function ErrorPage() {
  return (
    <>
      <SkipLink />
      <ErrorContent />
    </>
  );
}

function ErrorContent() {
  const error = useRouteError();
  const { errors: e } = useI18n();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <PageShell>
      <div className="m-auto w-full max-w-md text-center">
        <h1 className="text-balance font-display text-[2.25rem] font-light leading-[1.07] tracking-[-0.045em] text-foreground">
          {e.crashTitle}
        </h1>
        <p className="mt-4 text-[15px] text-muted-foreground">{e.crash}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
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
