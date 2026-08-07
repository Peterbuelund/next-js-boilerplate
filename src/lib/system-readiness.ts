// Server-only readiness probes. These run queries against the live database, so
// the module must never reach the browser — client components may import its
// TYPES only (`import type { DiagnosticsPayload }`), which is erased at compile
// time. The `server-only` import makes that boundary a build-time error rather
// than a convention.
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
// The migration journal drizzle-kit writes alongside the SQL files. Imported as
// a module (not read from disk at runtime) so it is inlined at build time: the
// `drizzle/` folder sits outside `src` and would not otherwise be traced into
// the server bundle, and a deployed app has no working directory to read from.
import journal from "../../drizzle/meta/_journal.json";

// How many migrations this build of the code expects to have been applied.
const EXPECTED_MIGRATIONS = journal.entries.length;

// A structured view of runtime database readiness — PURE STATE, no operator
// messages. `connected` is the `SELECT 1` ping; `schemaApplied` is whether the
// `user` table is queryable (i.e. migrations ran at all); `migrationsUpToDate`
// is whether EVERY migration this build ships has been applied. Operator-facing
// labels live solely in `readinessChecklist` below, never on the report.
//
// The last two are genuinely different failures. `schemaApplied` catches a
// database that was never migrated. `migrationsUpToDate` catches the far more
// common one: you pulled code carrying a new migration and forgot to run it, so
// the `user` table exists (schema check passes) but a column added later does
// not, and queries throw anyway.
export type ReadinessReport = {
  connected: boolean; // SELECT 1 succeeded
  schemaApplied: boolean; // the `user` table is queryable (migrations ran)
  migrationsUpToDate: boolean; // every migration in the journal is applied
};

// One operator-facing checklist row — a stable key, a human label and its ok
// flag. Deliberately carries NO remediation copy: the label plus its status
// icon is the whole signal, and anything more detailed belongs in the server
// logs, not in front of a user.
export type ReadinessStep = {
  key: string;
  label: string;
  ok: boolean;
};

// The `/api/diagnostics` wire contract: the checklist steps the error
// boundary's checklist renders, plus a proceed flag and the check timestamp.
export type DiagnosticsPayload = {
  timestamp: string;
  ready: boolean;
  steps: ReadinessStep[];
};

/**
 * The readiness invariant: the system is ready ONLY when the DB is connected,
 * the schema has been applied, and no migration this build ships is still
 * pending. Pure projection — the interface/test surface for "is the system
 * ready", with no DB of its own.
 */
export function isReady(report: ReadinessReport): boolean {
  return report.connected && report.schemaApplied && report.migrationsUpToDate;
}

/**
 * Project a `ReadinessReport` into the operator-facing checklist the error
 * boundary renders. This is the SINGLE home for the operator-facing labels; the
 * report itself is pure state. Pure: no DB, no timeout.
 *
 * `connected` and `schemaApplied` collapse into ONE row on purpose: they are
 * the same underlying failure to a reader, who only needs to know whether the
 * database is usable. Migrations get their own row because it is a genuinely
 * different fix (run `pnpm db:migrate`) reachable from a perfectly healthy
 * connection.
 *
 * INVARIANT: every row green must mean exactly `isReady`. The Continue button
 * is gated on that same flag, so any row that does not feed it would let the
 * checklist read all-green while the button stays hidden, with nothing on
 * screen explaining why.
 */
export function readinessChecklist(report: ReadinessReport): ReadinessStep[] {
  return [
    {
      key: "database",
      label: "Database ready",
      ok: report.connected && report.schemaApplied,
    },
    {
      key: "migrations",
      label: "Migrations up to date",
      ok: report.migrationsUpToDate,
    },
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
 * - `SELECT 1` fails (or the race times out) -> nothing is true.
 * - `SELECT 1` succeeds but the `user`-table touch fails -> connected, schema
 *   not applied (migrations likely never ran).
 * - schema is there but the journal count exceeds the applied count ->
 *   connected and applied, but migrations are behind this build of the code.
 * - all three succeed -> fully ready.
 */
export async function probeReadiness(): Promise<ReadinessReport> {
  try {
    let schemaApplied = false;
    let migrationsUpToDate = false;

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
        // migrations haven't run.
        schemaApplied = false;
      }

      try {
        // Count what drizzle-kit has actually applied against what this build
        // ships. A missing bookkeeping table throws and is treated as "behind",
        // which is correct: no table means nothing was ever applied.
        const applied = await db.execute<{ count: string }>(
          sql`SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations`,
        );
        // `>=` rather than `===`: a database migrated by a NEWER deployment than
        // the one serving this request is ahead, not broken, and rolling
        // instances would otherwise flap red mid-deploy.
        migrationsUpToDate = Number(applied[0]?.count ?? 0) >= EXPECTED_MIGRATIONS;
      } catch {
        migrationsUpToDate = false;
      }
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout (5s)")), 5000)
    );

    await Promise.race([dbCheckPromise, timeoutPromise]);

    // The race resolves only once `dbCheckPromise` has fully settled, so both
    // inner checks have finished; the timeout path rejects into the catch.
    return { connected: true, schemaApplied, migrationsUpToDate };
  } catch {
    return {
      connected: false,
      schemaApplied: false,
      migrationsUpToDate: false,
    };
  }
}
