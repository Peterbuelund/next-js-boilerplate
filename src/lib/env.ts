// Server-only environment contract. This module reads `BETTER_AUTH_SECRET` and
// other secrets out of `process.env`, so it must never be imported into a client
// component (where it would leak into the browser bundle). (The `server-only`
// package is not installed in this project, so we rely on convention rather than
// a hard guard, the same way `auth-guards.ts` does.)
//
// Fail-fast by design: the schema is parsed ONCE, at module load, and a missing
// or invalid variable throws — crashing the process at boot. There is no escape
// hatch (no `SKIP_ENV_VALIDATION`): an operator should learn about a broken
// environment the moment the server starts, not on the first request that needs
// the variable.
import { z } from "zod";

// `NEXT_PUBLIC_APP_URL` is only allowed to fall back to localhost outside of
// production. In production we have no safe default — a wrong public URL breaks
// auth callbacks and absolute links — so it is required. We can't express
// "required in prod, defaulted otherwise" with a single field rule because the
// requirement depends on a *sibling* field (`NODE_ENV`), so the field is parsed
// as optional and the cross-field invariant is enforced in `superRefine` below.
const envSchema = z
  .object({
    // Postgres connection string for Drizzle. No format check beyond non-empty:
    // the driver is the authority on what a valid DSN looks like.
    POSTGRES_URL: z.string().min(1, "POSTGRES_URL is required"),

    // Better Auth signing secret. Non-empty is the only contract we enforce here.
    BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),

    // The app's public origin. Parsed as an optional URL here; the
    // production-required / dev-defaulted behaviour is applied in `superRefine`.
    NEXT_PUBLIC_APP_URL: z
      .url("NEXT_PUBLIC_APP_URL must be a valid URL")
      .optional(),

    // Standard Node lifecycle flag. Defaults to development so a bare local
    // environment behaves as a dev environment.
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  })
  .superRefine((value, ctx) => {
    // The cross-field rule for `NEXT_PUBLIC_APP_URL`: required in production,
    // defaulted to localhost everywhere else. `superRefine` runs after the field
    // schemas, so `value.NODE_ENV` is already resolved (default applied).
    if (value.NODE_ENV === "production" && value.NEXT_PUBLIC_APP_URL == null) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_APP_URL"],
        message: "NEXT_PUBLIC_APP_URL is required when NODE_ENV is 'production'",
      });
    }
  })
  .transform((value) => ({
    ...value,
    // Apply the non-production fallback only after validation has confirmed the
    // (now safe) absence is allowed. In production the absence already failed
    // above, so we never reach here with a missing value in prod.
    NEXT_PUBLIC_APP_URL:
      value.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  }));

/** The validated, typed environment contract. */
export type Env = z.infer<typeof envSchema>;

// --- the parse (PURE and testable) ----------------------------------------

/**
 * Validate a raw environment bag against the contract and return the typed,
 * defaulted result. Pure: it touches `process.env` only via its argument, so
 * tests drive it with fixtures instead of mutating the real environment.
 *
 * Throws an `Error` whose message lists every offending variable and why, so an
 * operator reading a server log knows exactly what to fix. We re-shape the
 * `ZodError.issues` rather than surfacing the raw error, which is dense and
 * formatted for developers, not operators.
 */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        // `path` is the variable name (or empty for a whole-object issue).
        const name = issue.path.join(".") || "(env)";
        return `  - ${name}: ${issue.message}`;
      })
      .join("\n");
    throw new Error(
      `Invalid environment variables. Fix the following before starting the server:\n${details}`,
    );
  }
  return result.data;
}

// At module load, validate the real process environment. Importing this module
// anywhere on the server therefore triggers the boot-time check, and a broken
// environment crashes the process here rather than later at use sites.
export const env = parseEnv(process.env);
