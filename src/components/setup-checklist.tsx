"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type DiagnosticsResponse = {
  timestamp: string;
  env: {
    POSTGRES_URL: boolean;
    BETTER_AUTH_SECRET: boolean;
    NEXT_PUBLIC_APP_URL: boolean;
  };
  database: {
    connected: boolean;
    schemaApplied: boolean;
    error?: string;
  };
  auth: {
    configured: boolean;
    routeResponding: boolean | null;
  };
  overallStatus: "ok" | "error";
};

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <div title="ok">
      <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="ok" />
    </div>
  ) : (
    <div title="not ok">
      <XCircle className="h-4 w-4 text-red-600" aria-label="not-ok" />
    </div>
  );
}

export function SetupChecklist() {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  // Starts true: the mount effect below always kicks off a fetch.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/diagnostics", { cache: "no-store", signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as DiagnosticsResponse;
  }, []);

  // Manual "Re-check" handler — an event handler, so synchronous setState here
  // is fine (unlike inside an effect).
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchDiagnostics());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load diagnostics");
    } finally {
      setLoading(false);
    }
  }, [fetchDiagnostics]);

  // Initial load on mount. setState only runs in the promise callbacks (after
  // the fetch resolves), never synchronously in the effect body.
  useEffect(() => {
    const controller = new AbortController();
    fetchDiagnostics(controller.signal)
      .then((json) => setData(json))
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load diagnostics");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [fetchDiagnostics]);

  const envVarsToCheck = [
    { key: "POSTGRES_URL" as const, label: "POSTGRES_URL" },
    { key: "BETTER_AUTH_SECRET" as const, label: "BETTER_AUTH_SECRET" },
  ] as const;

  const missingEnvVars = data
    ? envVarsToCheck.filter((v) => !data.env[v.key]).map((v) => v.label)
    : [];

  const steps = [
    {
      key: "env",
      label: "Environment variables",
      ok:
        !!data?.env.POSTGRES_URL &&
        !!data?.env.BETTER_AUTH_SECRET,
      detail:
        missingEnvVars.length > 0
          ? `Missing: ${missingEnvVars.join(", ")}`
          : undefined,
    },
    {
      key: "db-connected",
      label: "Database connected",
      ok: !!data?.database.connected,
      detail: !data?.database.connected
        ? data?.database.error
          ? `Error: ${data.database.error}`
          : "Database not connected. Start your PostgreSQL database and verify POSTGRES_URL"
        : undefined,
    },
    {
      key: "db-schema",
      label: "Database schema applied",
      ok: !!data?.database.schemaApplied,
      detail: !data?.database.schemaApplied
        ? "Run: pnpm db:migrate"
        : undefined,
    },
    {
      key: "auth",
      label: "Auth configured",
      ok: !!data?.auth.configured,
      detail:
        data?.auth.routeResponding === false
          ? "Auth route not responding"
          : undefined,
    },
  ] as const;

  const completed = steps.filter((s) => s.ok).length;

  return (
    <div className="p-6 border rounded-lg text-left">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Setup checklist</h3>
          <p className="text-sm text-muted-foreground">
            {completed}/{steps.length} completed
          </p>
        </div>
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? "Checking..." : "Re-check"}
        </Button>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.key} className="flex items-start gap-2">
            <div className="mt-0.5">
              <StatusIcon ok={Boolean(s.ok)} />
            </div>
            <div>
              <div className="font-medium">{s.label}</div>
              {s.detail ? (
                <div className="text-sm text-muted-foreground">{s.detail}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {data?.overallStatus === "ok" ? (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Everything looks good.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Continue
          </Button>
        </div>
      ) : null}

      {data ? (
        <div className="mt-4 text-xs text-muted-foreground">
          Last checked: {new Date(data.timestamp).toLocaleString()}
        </div>
      ) : null}
    </div>
  );
}
