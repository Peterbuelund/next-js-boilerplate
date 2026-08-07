import { NextResponse } from "next/server";
import {
  probeReadiness,
  isReady,
  readinessChecklist,
  type DiagnosticsPayload,
} from "@/lib/system-readiness";

// This endpoint is intentionally public (no auth required) because it backs the
// setup checklist the error boundary renders, and that has to work before an
// operator can sign in — a broken database is exactly the state in which no one
// *can* authenticate. It returns only boolean flags and canned remediation
// about runtime database state, not sensitive data.
//
// Thin serializer over `probeReadiness`: the payload is a pure projection of one
// probe, and the operator-facing steps come from the single `readinessChecklist`
// projection so remediation copy has exactly one home.
export async function GET() {
  const report = await probeReadiness();
  const payload: DiagnosticsPayload = {
    timestamp: new Date().toISOString(),
    ready: isReady(report),
    steps: readinessChecklist(report),
  };
  return NextResponse.json(payload);
}
