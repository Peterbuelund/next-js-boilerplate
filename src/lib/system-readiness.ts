import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

// A structured view of runtime database readiness, the single source of truth
// behind both the boolean Entry-cascade gate and the diagnostics payload.
// `connected` is the `SELECT 1` ping; `schemaApplied` is whether the `user`
// table is queryable (i.e. migrations ran); `error` is an operator-facing
// message present only when the system is not ready.
export type ReadinessReport = {
  connected: boolean; // SELECT 1 succeeded
  schemaApplied: boolean; // the `user` table is queryable (migrations ran)
  error?: string; // operator-facing message when not ready
};

/**
 * The readiness invariant: the system is ready ONLY when the DB is connected
 * AND the schema has been applied. Pure projection — the interface/test surface
 * for "is the system ready", with no DB of its own.
 */
export function isReady(report: ReadinessReport): boolean {
  return report.connected && report.schemaApplied;
}

/**
 * The single runtime DB readiness probe.
 *
 * Environment is validated at boot (see `env.ts`), so this probe is concerned
 * solely with runtime database state. The DB work runs under a 5s timeout race
 * so an unreachable database can never hang the caller. This function never
 * throws: every failure is folded into a `ReadinessReport`.
 *
 * - `SELECT 1` fails (or the race times out) -> not connected, not applied.
 * - `SELECT 1` succeeds but the `user`-table touch fails -> connected, schema
 *   not applied (migrations likely haven't run).
 * - both succeed -> connected and schema applied, no error.
 */
export async function probeReadiness(): Promise<ReadinessReport> {
  try {
    let schemaApplied = false;
    let schemaError: string | undefined;

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
        // migrations haven't run; surface that rather than the connect message.
        schemaApplied = false;
        schemaError = "Schema not applied. Run: pnpm db:migrate";
      }
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout (5s)")), 5000)
    );

    await Promise.race([dbCheckPromise, timeoutPromise]);

    // Reaching here means the ping succeeded (it's the only path that resolves
    // the race); only the schema touch can still be outstanding.
    return schemaApplied
      ? { connected: true, schemaApplied: true }
      : { connected: true, schemaApplied: false, error: schemaError };
  } catch {
    return {
      connected: false,
      schemaApplied: false,
      error:
        "Database not connected. Please start your PostgreSQL database and verify your POSTGRES_URL in .env",
    };
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
