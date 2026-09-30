/**
 * Create the first administrator and print a one-time invite link for them to
 * choose a password in the browser.
 *
 * Usage:
 *   pnpm create-admin <email> "<name>" [--env <file>]
 *   pnpm create-admin <email> --reissue [--env <file>]
 *
 * Refuses when any administrator already exists or the email is taken.
 * `--reissue` issues a fresh link for an EXISTING administrator and invalidates
 * their earlier links. No password is ever printed or accepted here.
 *
 * Env: POSTGRES_URL (required) and NEXT_PUBLIC_APP_URL (link origin, default
 * http://localhost:3000), read from `--env <file>` (default `.env`). Variables
 * already set in the shell win over the file.
 *
 * Builds its own database client rather than importing `@/lib/db`: that module
 * is `server-only` and validates secrets (BETTER_AUTH_SECRET) this script does
 * not need.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/schema";
import {
  createFirstAdmin,
  inviteUrl,
  reissueAdminInvite,
} from "@/lib/admin-invite";

const USAGE = `Usage:
  pnpm create-admin <email> "<name>" [--env <file>]
  pnpm create-admin <email> --reissue [--env <file>]`;

function exitWith(message: string, showUsage = false): never {
  console.error(`Error: ${message}`);
  if (showUsage) console.error(`\n${USAGE}`);
  process.exit(1);
}

// Minimal .env loader (same rules as scripts/set-admin.ts) so the script does
// not need `dotenv`. Only fills keys the shell has not already set. A missing
// default `.env` is fine; a missing file the caller named explicitly is not.
function loadEnvFile(file: string, explicit: boolean): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    if (explicit) exitWith(`env file not found: ${file}`);
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseCli() {
  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      options: {
        env: { type: "string" },
        reissue: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
    if (values.help) {
      console.log(USAGE);
      process.exit(0);
    }
    const [email, name, ...rest] = positionals;
    if (!email) exitWith("missing <email>", true);
    if (rest.length > 0) exitWith("too many arguments (quote the name)", true);
    if (!values.reissue && !name?.trim()) exitWith("missing <name>", true);
    return { email, name: name ?? "", reissue: values.reissue, envFile: values.env };
  } catch (err) {
    exitWith(err instanceof Error ? err.message : String(err), true);
  }
}

async function main(): Promise<void> {
  const args = parseCli();
  loadEnvFile(args.envFile ?? ".env", args.envFile !== undefined);

  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    exitWith("POSTGRES_URL is not set. Add it to the env file or export it.");
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const client = postgres(connectionString, { onnotice: () => {} });
  const db = drizzle(client, { schema });

  try {
    const result = args.reissue
      ? await reissueAdminInvite(db, { email: args.email })
      : await createFirstAdmin(db, { email: args.email, name: args.name });
    if (!result.ok) {
      // Not `exitWith`: returning lets `finally` close the pool first.
      console.error(`Error: ${result.error}`);
      process.exitCode = 1;
      return;
    }

    const { email, token, expiresAt } = result.data;
    console.log(
      args.reissue
        ? `Issued a new invite link for administrator ${email}. Earlier links no longer work.`
        : `Created administrator ${email}.`,
    );
    console.log("\nOpen this one-time link to choose a password:\n");
    console.log(`  ${inviteUrl(baseUrl, token)}\n`);
    console.log(`The link expires at ${expiresAt.toISOString()} and works once.`);
  } finally {
    // postgres-js keeps the pool alive; close it so the process exits.
    await client.end({ timeout: 5 });
  }
}

main().then(
  () => process.exit(),
  (error) => {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
