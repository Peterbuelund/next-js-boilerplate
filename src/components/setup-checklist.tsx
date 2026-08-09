"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  DiagnosticsPayload,
  ReadinessStep,
} from "@/lib/system-readiness";

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

// The browser's origin cannot change without a full page load, so there is
// never anything to notify React about; the store is read-once by definition.
const subscribeToNothing = () => () => {};

// True when `NEXT_PUBLIC_APP_URL` agrees with the origin actually being served.
// An unset value is NOT a failure: `env.ts` defaults it to localhost on the
// server, so an absent public var leaves the client nothing to compare against.
function checkOrigin(): boolean {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return true;
  try {
    return new URL(configured).origin === window.location.origin;
  } catch {
    return false; // unparseable value — a misconfiguration either way
  }
}

type SetupChecklistProps = {
  // How the operator leaves the checklist once everything is green. Injected
  // rather than hardcoded as a navigation: the only host is an error boundary,
  // where there is no page to navigate away from — the boundary has to discard
  // the failed RSC payload and re-render the subtree it caught (see `retry` in
  // error.tsx). A router.push here would leave the boundary mounted over a route
  // that never re-attempted its render.
  onContinue: () => void;
};

export function SetupChecklist({ onContinue }: SetupChecklistProps) {
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

  // The ONE check the server cannot make. `NEXT_PUBLIC_APP_URL` becomes Better
  // Auth's `baseURL`, so when it disagrees with the origin the browser is
  // actually on — wrong port, a proxy in front, a deployed build still naming
  // localhost — sign-in callbacks and cookies fail in ways that surface as
  // confusing auth bugs rather than clean errors. Only the browser knows its
  // own origin, so this row is computed here rather than in `/api/diagnostics`.
  //
  // Read through `useSyncExternalStore` rather than an effect: the origin is
  // immutable browser state, so there is nothing to synchronise INTO React
  // state, and the server snapshot (`null`) keeps the row off the first paint
  // instead of flashing red before hydration.
  const originOk = useSyncExternalStore(
    subscribeToNothing,
    checkOrigin,
    () => null,
  );

  // Server rows come straight from the server projection; the client owns no
  // operator copy of its own beyond the origin row above.
  const steps: ReadinessStep[] = [
    ...(data?.steps ?? []),
    ...(originOk === null
      ? []
      : [{ key: "app-url", label: "App URL matches origin", ok: originOk }]),
  ];
  const completed = steps.filter((s) => s.ok).length;

  // Continue appears only when EVERY row is green, server and client alike, so
  // an all-green checklist and an available button can never disagree. A failing
  // origin is a real misconfiguration to fix, and "Try again" below is still
  // there as the unconditional retry.
  const ready = Boolean(data?.ready) && originOk !== false;

  return (
    <div className="p-6 border rounded-lg text-left">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Checklist</h3>
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
            <div className="font-medium">{s.label}</div>
          </li>
        ))}
      </ul>

      {ready ? (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">
            Everything looks good.
          </p>
          <Button className="w-full" onClick={onContinue}>
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
