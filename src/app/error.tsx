"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for the whole app.
 *
 * Deliberately plain: a heading, the error digest, and a retry. Nothing about
 * the running system is exposed — the digest is what correlates a user's report
 * to the server log line.
 *
 * `retry()` re-fetches the failed segment from the server and re-renders it, so
 * it recovers once the underlying problem (e.g. the database) is fixed.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // Surface the failure in the browser console for debugging.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-sm">
          An unexpected error occurred. Please try again.
        </p>

        {/* `error.message` is never rendered: it can leak connection strings
            and query text. The digest is the safe identifier. */}
        {error.digest ? (
          <p className="text-muted-foreground font-mono text-xs">
            Error reference: {error.digest}
          </p>
        ) : null}

        <Button variant="outline" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
