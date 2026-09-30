"use client";

/**
 * Last-resort boundary: it catches errors thrown by the root layout itself, so
 * it REPLACES that layout and must emit its own <html> and <body>. None of the
 * layout's work has happened — no fonts, no ThemeProvider, no theme tokens.
 *
 * Everything here is therefore self-contained: no app imports, no ui
 * components, inline styles only. Colours follow the OS colour scheme since the
 * app's theme toggle can't reach this document.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
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
          boxSizing: "border-box",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Something went wrong</title>
        <style>{`
          body { background: #fff; color: #111; }
          .ge-muted { color: #666; }
          .ge-button { background: #111; color: #fff; border: 1px solid #ccc; }
          @media (prefers-color-scheme: dark) {
            body { background: #0a0a0a; color: #eee; }
            .ge-muted { color: #999; }
            .ge-button { background: #eee; color: #111; border-color: #444; }
          }
        `}</style>

        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p className="ge-muted" style={{ fontSize: "0.875rem" }}>
            An unexpected error occurred. Please try again.
          </p>

          {/* The digest is the only handle on the server-side log entry;
              `error.message` is never rendered. */}
          {error.digest ? (
            <p
              className="ge-muted"
              style={{
                fontSize: "0.75rem",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Error reference: {error.digest}
            </p>
          ) : null}

          <button
            className="ge-button"
            onClick={() => retry()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              borderRadius: "9999px",
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
