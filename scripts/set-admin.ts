/**
 * Promote a user to the "admin" role by email.
 *
 * Usage:
 *   npx tsx scripts/set-admin.ts <email>
 *
 * The script reads POSTGRES_URL from the environment. If it isn't set, it falls
 * back to a minimal parse of the project's .env file so the script "just works"
 * during local development without requiring `dotenv` as a dependency.
 *
 * For other environments, prefer Node's built-in --env-file flag, e.g.:
 *   node --env-file=.env --import tsx scripts/set-admin.ts <email>
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@/lib/schema";

// Minimal .env loader so we don't pull in a runtime dep just for a one-shot script.
// Only fills in keys that aren't already defined in process.env.
function loadDotEnvIfPresent(): void {
  const envPath = resolve(process.cwd(), ".env");
  let raw: string;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    return; // No .env file — that's fine if env vars come from the shell.
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding single or double quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main(): Promise<void> {
  loadDotEnvIfPresent();

  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Error: missing <email> argument.");
    console.error("Usage: npx tsx scripts/set-admin.ts <email>");
    process.exit(1);
  }

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error(
      "Error: POSTGRES_URL is not set. Add it to .env or export it in your shell.",
    );
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    const updated = await db
      .update(schema.user)
      .set({ role: "admin" })
      .where(eq(schema.user.email, email))
      .returning({ id: schema.user.id, email: schema.user.email });

    if (updated.length === 0) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    console.log(`Promoted ${updated[0].email} (id: ${updated[0].id}) to admin.`);
  } catch (error) {
    console.error("Failed to set admin role:", error);
    process.exit(1);
  } finally {
    // postgres-js keeps the connection pool alive; close it so the process exits.
    await client.end({ timeout: 5 });
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
