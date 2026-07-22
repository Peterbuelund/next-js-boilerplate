import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

// A structured view of runtime database readiness — PURE STATE, no operator
// messages. `connected` is the `SELECT 1` ping; `schemaApplied` is whether the
// `user` table is queryable (i.e. migrations ran). Operator-facing remediation
// copy lives solely in `readinessChecklist` below, never on the report.
export type ReadinessReport = {
  connected: boolean; // SELECT 1 succeeded
  schemaApplied: boolean; // the `user` table is queryable (migrations ran)
};

// One operator-facing checklist row: a stable key, a human label, its ok flag,
// and — only when failing — the remediation to run.
export type ReadinessStep = {
  key: string;
  label: string;
  ok: boolean;
  detail?: string;
};

// The `/api/diagnostics` wire contract: the checklist steps the /preflight page
// renders, plus a proceed flag and the check timestamp.
export type DiagnosticsPayload = {
  timestamp: string;
  ready: boolean;
  steps: ReadinessStep[];
};

/**
 * The readiness invariant: the system is ready ONLY when the DB is connected
 * AND the schema has been applied. Pure projection — the interface/test surface
 * for "is the system ready", with no DB of its own.
 */
export function isReady(report: ReadinessReport): boolean {
  return report.connected && report.schemaApplied;
}

// Build one checklist row, attaching the remediation only when the check fails.
function step(
  key: string,
  label: string,
  ok: boolean,
  remediation: string,
): ReadinessStep {
  return ok ? { key, label, ok } : { key, label, ok, detail: remediation };
}

/**
 * Project a `ReadinessReport` into the operator-facing checklist the /preflight
 * page renders — one step per runtime check, each carrying its OWN remediation
 * when failing (so a down DB still shows the schema step its migrate hint, not
 * the connection message). This is the SINGLE home for operator remediation
 * copy; the report itself is pure state. Pure: no DB, no timeout.
 */
export function readinessChecklist(report: ReadinessReport): ReadinessStep[] {
  return [
    step(
      "db-connected",
      "Database connected",
      report.connected,
      "Database not connected. Start your PostgreSQL database and verify POSTGRES_URL in .env",
    ),
    step(
      "db-schema",
      "Database schema applied",
      report.schemaApplied,
      "Run: pnpm db:migrate",
    ),
  ];
}

/**
 * The single runtime DB readiness probe.
 *
 * Environment is validated at boot (see `env.ts`), so this probe is concerned
 * solely with runtime database state. The DB work runs under a 5s timeout race
 * so an unreachable database can never hang the caller. This function never
 * throws: every failure is folded into a `ReadinessReport` of pure booleans.
 *
 * - `SELECT 1` fails (or the race times out) -> not connected, not applied.
 * - `SELECT 1` succeeds but the `user`-table touch fails -> connected, schema
 *   not applied (migrations likely haven't run).
 * - both succeed -> connected and schema applied.
 */
export async function probeReadiness(): Promise<ReadinessReport> {
  try {
    let schemaApplied = false;

    const dbCheckPromise = (async () => {
      // Ping DB - this will actually attempt to connect.
      const result = await db.execute(sql`SELECT 1 as ping`);
      if (!result) {
        throw new Error("Database query returned no result");
      }

      try {
        // Touch a known table to verify migrations have been applied.
        await db.select().from(schema.user).limit(1);
        schemaApplied = true;
      } catch {
        // A reachable DB whose `user` table is unqueryable almost always means
        // migrations haven't run. The remediation lives in `readinessChecklist`.
        schemaApplied = false;
      }
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout (5s)")), 5000)
    );

    await Promise.race([dbCheckPromise, timeoutPromise]);

    // Reaching here means the ping succeeded (it's the only path that resolves
    // the race); only the schema touch can still be outstanding.
    return { connected: true, schemaApplied };
  } catch {
    return { connected: false, schemaApplied: false };
  }
}

/**
 * Derived boolean gate used by the Entry cascade. A thin projection over the
 * shared probe so the gate and the diagnostics payload share one source of
 * truth. Never throws.
 */
export async function getSystemReadiness(): Promise<{ ready: boolean }> {
  return { ready: isReady(await probeReadiness()) };
}
