import { NextResponse } from "next/server";
import {
  probeReadiness,
  isReady,
  readinessChecklist,
  type DiagnosticsPayload,
} from "@/lib/system-readiness";

// DEVELOPMENT ONLY. This endpoint is unauthenticated — it has to be, since it
// backs a checklist shown when the database is down and therefore nobody *can*
// authenticate — so instead of shipping an open infrastructure-status probe, it
// simply does not exist in production.
//
// Losing it there costs nothing: a deployed app reports the same failure through
// its server logs, which `error.tsx` writes to via console.error alongside the
// digest that correlates them. The checklist's real value is local development,
// where the usual failure is "Postgres isn't running" and the alternative is
// reading a Drizzle stack trace.
//
// Thin serializer over `probeReadiness`: the payload is a pure projection of one
// probe, and the operator-facing steps come from the single `readinessChecklist`
// projection so the labels have exactly one home.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const report = await probeReadiness();
  const payload: DiagnosticsPayload = {
    timestamp: new Date().toISOString(),
    ready: isReady(report),
    steps: readinessChecklist(report),
  };
  return NextResponse.json(payload);
}
