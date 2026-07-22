import { NextResponse } from "next/server";
import {
  probeReadiness,
  isReady,
  readinessChecklist,
  type DiagnosticsPayload,
} from "@/lib/system-readiness";

// This endpoint is intentionally public (no auth required) because it's used by
// the setup checklist on /preflight before an operator can sign in. It returns
// only boolean flags and canned remediation about runtime database state, not
// sensitive data.
//
// Thin serializer over the shared readiness probe: the boolean Entry-cascade
// gate and this payload both project from a single source of truth
// (`probeReadiness`), and the operator-facing steps come from the single
// `readinessChecklist` projection.
export async function GET() {
  const report = await probeReadiness();
  const payload: DiagnosticsPayload = {
    timestamp: new Date().toISOString(),
    ready: isReady(report),
    steps: readinessChecklist(report),
  };
  return NextResponse.json(payload);
}
