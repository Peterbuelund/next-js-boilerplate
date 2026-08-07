"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SetupChecklist } from "@/components/setup-checklist";

/**
 * Route-level error boundary for the whole app.
 *
 * Next.js requires error boundaries to be Client Components, which is exactly
 * why the diagnosis below is fetched over HTTP instead of probed inline: this
 * file runs in the browser, so it cannot call `probeReadiness()` (that touches
 * the database and would drag server-only modules into the client bundle). On
 * top of that, in production Next strips the thrown error down to a `digest` —
 * the message an operator would need is deliberately gone. So the only way to
 * tell "the database is down" apart from "migrations never ran" is to ask the
 * server: `<SetupChecklist />` hits `/api/diagnostics`, which projects the same
 * readiness probe and the same remediation copy the old /preflight page showed.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Surface the failure in the browser console for local debugging; in
  // production this is the only client-side trace of what was thrown.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm">
            The page failed to render. The checks below run against the live
            system — if one is failing, its remediation is very likely the fix.
          </p>

          {/* The digest is the ONLY identifier that correlates this render to a
              server log line in production, so it is always shown. */}
          {error.digest ? (
            <p className="text-muted-foreground font-mono text-xs">
              Error digest: {error.digest}
            </p>
          ) : null}

          {/* Raw messages can leak connection strings, table names and stack
              detail, so they stay behind a development-only gate. Production
              operators get the digest plus the checklist instead. */}
          {process.env.NODE_ENV !== "production" ? (
            <p className="text-destructive text-sm break-words">
              {error.message}
            </p>
          ) : null}
        </div>

        <SetupChecklist onContinue={reset} />

        {/* An escape hatch for failures the checklist can't explain (all steps
            green): retry the render without leaving the route. */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
