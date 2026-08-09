"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SetupChecklist } from "@/components/setup-checklist";

/**
 * Route-level error boundary for the whole app.
 *
 * In production this renders a deliberately plain page: a heading, the error
 * digest, and a retry. Nothing about the running system is exposed to whoever
 * happened to trip the error — they are usually an end user, and the digest is
 * what correlates their report to the server log line `console.error` wrote.
 *
 * In development it additionally renders the readiness checklist, which turns
 * the overwhelmingly common local failure ("Postgres isn't running", "you
 * forgot to migrate") into a plain answer instead of a Drizzle stack trace.
 * `IS_DEV` is a build-time constant, so the checklist, its fetch, and the whole
 * component are eliminated from the production client bundle rather than merely
 * hidden behind a runtime branch.
 *
 * Next.js requires error boundaries to be Client Components, which is why that
 * diagnosis is fetched over HTTP rather than probed inline: this file runs in
 * the browser and cannot call `probeReadiness()` without dragging server-only
 * modules into the client bundle.
 */
const IS_DEV = process.env.NODE_ENV !== "production";
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isRetrying, startRetry] = useTransition();

  // Surface the failure in the browser console for local debugging; in
  // production this is the only client-side trace of what was thrown.
  useEffect(() => {
    console.error(error);
  }, [error]);

  /**
   * `reset()` ALONE IS NOT ENOUGH, and this is the whole reason this handler
   * exists. It re-renders the boundary's subtree on the client, but the route
   * that failed is a Server Component whose RSC payload is still cached in the
   * client Router Cache — in its failed state. Resetting re-renders from that
   * same cached payload, throws again immediately, and lands back here, so the
   * button appears to do nothing even after the operator has fixed the actual
   * problem (started Postgres, run the migrations).
   *
   * `router.refresh()` is what discards the cached payload and refetches the
   * segment from the server. Both run inside one transition so React treats the
   * refetch and the re-render as a single non-blocking update, and `isRetrying`
   * gives the buttons something honest to show while the server round trip is
   * in flight.
   */
  const retry = () => {
    startRetry(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm">
            {IS_DEV
              ? "The page failed to render. The checks below run against the live system — anything failing is very likely the cause."
              : "The page failed to render. Try again, and quote the digest below if you need to report it."}
          </p>

          {/* The digest is the ONLY identifier that correlates this render to a
              server log line in production, so it is always shown. */}
          {error.digest ? (
            <p className="text-muted-foreground font-mono text-xs">
              Error digest: {error.digest}
            </p>
          ) : null}

          {/* The raw `error.message` is deliberately never rendered, in any
              environment: it leaks connection strings, table names and query
              text, and it is unreadable to the operator anyway. The console
              trace below carries it for local debugging; the checklist carries
              the explanation worth reading. */}
        </div>

        {IS_DEV ? <SetupChecklist onContinue={retry} /> : null}

        {/* An escape hatch for failures the checklist can't explain (all steps
            green), and the ONLY control in production: retry the render without
            leaving the route. */}
        <div className="flex justify-center">
          <Button variant="outline" onClick={retry} disabled={isRetrying}>
            {isRetrying ? "Retrying…" : "Try again"}
          </Button>
        </div>
      </div>
    </div>
  );
}
