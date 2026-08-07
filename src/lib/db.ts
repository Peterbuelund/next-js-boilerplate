// Server-only database handle. Opens the Postgres connection and reads
// `POSTGRES_URL` via `@/lib/env`, so it must never reach the browser. The
// `server-only` import makes that boundary a build-time error rather than a
// convention.
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/schema";
import { env } from "@/lib/env";

const client = postgres(env.POSTGRES_URL);
export const db = drizzle(client, { schema });
