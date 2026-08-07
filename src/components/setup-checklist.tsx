"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiagnosticsPayload } from "@/lib/system-readiness";

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

type SetupChecklistProps = {
  // How the operator leaves the checklist once everything is green. Injectable
  // because the recovery action differs by host: standing on a page, the fix is
  // to navigate home; inside an error boundary there is no page to navigate
  // away from — the boundary must re-render the subtree it caught (`reset`).
  // Hardcoding router.push there would leave the boundary mounted over a route
  // that never re-attempted its render.
  onContinue?: () => void;
};

export function SetupChecklist({ onContinue }: SetupChecklistProps = {}) {
  const router = useRouter();
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  // Starts true: the mount effect below always kicks off a fetch.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/diagnostics", { cache: "no-store", signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as DiagnosticsPayload;
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

  // The checklist rows come straight from the server projection; the client is
  // a dumb renderer and owns no labels or remediation of its own.
  const steps = data?.steps ?? [];
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
              <StatusIcon ok={s.ok} />
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

      {data?.ready ? (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Everything looks good.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              if (onContinue) {
                onContinue();
                return;
              }
              router.push("/");
              // Readiness changed server-side since this page loaded, so drop
              // the cached RSC payload the entry gate was rendered from.
              router.refresh();
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
