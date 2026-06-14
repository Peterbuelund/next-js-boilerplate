import { NextResponse } from "next/server";
import { probeReadiness, isReady } from "@/lib/system-readiness";

// This endpoint is intentionally public (no auth required) because it's used
// by the setup checklist on the homepage before users are logged in.
// It only returns boolean flags about runtime database state, not sensitive data.
//
// Thin serializer over the shared readiness probe: the boolean gate and this
// payload both project from a single source of truth (`probeReadiness`).
export async function GET() {
  const report = await probeReadiness();
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    database: {
      connected: report.connected,
      schemaApplied: report.schemaApplied,
      ...(report.error !== undefined && { error: report.error }),
    },
    overallStatus: isReady(report) ? "ok" : "error",
  });
}
