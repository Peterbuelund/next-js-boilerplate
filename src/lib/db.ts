import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/schema";

const connectionString = process.env.POSTGRES_URL;

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (connectionString) {
  const client = postgres(connectionString);
  db = drizzle(client, { schema });
} else if (process.env.NODE_ENV === "production") {
  throw new Error("POSTGRES_URL environment variable is not set");
}

export { db };