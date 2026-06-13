import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";

/**
 * Returns whether the system is ready to serve users.
 *
 * "ready" is true ONLY when ALL of the following hold:
 * - BETTER_AUTH_SECRET is a non-empty string
 * - the database handle is non-null
 * - a `SELECT 1` ping succeeds
 * - the `user` table can be queried (schema migrated)
 *
 * This function never throws: any error results in `{ ready: false }`.
 */
export async function getSystemReadiness(): Promise<{ ready: boolean }> {
  try {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (typeof secret !== "string" || secret.length === 0) {
      return { ready: false };
    }

    if (!db) {
      return { ready: false };
    }

    const handle = db;

    const dbCheckPromise = (async () => {
      // Ping DB - this will actually attempt to connect.
      const result = await handle.execute(sql`SELECT 1 as ping`);
      if (!result) {
        throw new Error("Database query returned no result");
      }
      // Touch a known table to verify migrations have been applied.
      await handle.select().from(schema.user).limit(1);
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout (5s)")), 5000)
    );

    await Promise.race([dbCheckPromise, timeoutPromise]);

    return { ready: true };
  } catch {
    return { ready: false };
  }
}
