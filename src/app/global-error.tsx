"use client";

/**
 * Last-resort boundary: it catches errors thrown by the root layout itself, so
 * it REPLACES that layout rather than rendering inside it. That means it must
 * emit its own <html> and <body>, and — critically — none of the layout's work
 * has happened: no font variables, no ThemeProvider class, no CSS custom
 * properties backing the Tailwind theme tokens.
 *
 * Everything here is therefore deliberately self-contained. No <SetupChecklist>
 * (it renders theme-token classes and would come out unstyled, and the failure
 * at this level is usually not a readiness problem), no ui <Button>, no
 * `text-muted-foreground`. Inline styles only, so this page renders correctly
 * even when the stylesheet or provider chain is the thing that broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#111",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Application error
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#666" }}>
            The application failed to start. Check the server logs for details.
          </p>

          {/* The digest is the only handle on the server-side log entry once
              Next has stripped the message in production. */}
          {error.digest ? (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#666",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Error digest: {error.digest}
            </p>
          ) : null}

          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              borderRadius: "9999px",
              border: "1px solid #ccc",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
