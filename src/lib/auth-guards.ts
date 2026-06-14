// Server-only authorization guards. Imports `next/headers`, so this module must
// never be imported into client components. (The `server-only` package is not
// installed in this project, so we rely on convention rather than a hard guard.)
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, type Session, type User } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import type { UserRole } from "@/lib/user-schema";

type AuthContext = { session: Session; user: User };

// Admin guards re-read the role with a live DB, so they can hand back a
// non-null `db` and spare callers from re-asserting it across the call boundary.
type AdminContext = AuthContext & { db: NonNullable<typeof db> };

/** A non-null Drizzle database handle (the live connection an Access guard needs
 *  to re-read Role from the database). */
type Database = NonNullable<typeof db>;

// Why an admin Access guard denied the request, modelled so the decision can be
// expressed without coupling to Next's `redirect`/`throw` side effects.
// `db-unavailable` means the live Role could not be read (no DB connection),
// which an Access guard must treat as a denial rather than a pass.
export type AccessReason = "no-session" | "db-unavailable" | "not-admin";

// The outcome of resolving an admin Access guard: either the verified context
// or the reason it was denied. The public wrappers translate this into a
// redirect (pages) or a throw (Server Actions).
export type Outcome =
  | { ok: true; ctx: AuthContext }
  | { ok: false; reason: AccessReason };

// --- plumbing (shared by all four wrappers) -------------------------------

/** Fetch the current Session via Better Auth, or `null` when there is none. */
export async function getSession(): Promise<AuthContext | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result?.session) {
    return null;
  }
  return { session: result.session, user: result.user };
}

/**
 * Re-read a user's Role straight from the database. This is the live read the
 * admin Access guards rely on: we never trust the Session's claims, so revoking
 * admin in the DB takes effect immediately on the next request. Returns `null`
 * when the user row has vanished.
 */
async function readRole(
  database: Database,
  userId: string,
): Promise<UserRole | null> {
  const [currentUser] = await database
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  // `role` is a free-text column constrained by `userRoleSchema` on write.
  return (currentUser?.role as UserRole | undefined) ?? null;
}

// --- the invariant (PURE and testable) ------------------------------------

/**
 * The admin Access guard invariant: a caller is admin only if the *reader*
 * (a live DB read) says so — the Session is never consulted for Role. The DB
 * being unavailable is modelled as a `null` reader, which is a denial, not a
 * pass. Pure: no `next/headers`, no `redirect`, no DB of its own.
 */
export async function resolveAdmin(
  ctx: AuthContext | null,
  reader: ((userId: string) => Promise<UserRole | null>) | null,
): Promise<Outcome> {
  if (!ctx) return { ok: false, reason: "no-session" };
  if (!reader) return { ok: false, reason: "db-unavailable" };
  if ((await reader(ctx.user.id)) !== "admin") {
    return { ok: false, reason: "not-admin" };
  }
  return { ok: true, ctx };
}

// --- public Access guards (thin translators over the seam above) ----------

/**
 * Resolve the current session for a Server Component / page. Redirects to the
 * sign-in route when there is no active session.
 */
export async function requireSessionOrRedirect(): Promise<AuthContext> {
  const ctx = await getSession();
  if (!ctx) {
    redirect("/auth/sign-in");
  }
  return ctx;
}

/**
 * Resolve the current session for a Server Action. Throws "Unauthorized" when
 * there is no active session.
 */
export async function requireSessionOrThrow(): Promise<AuthContext> {
  const ctx = await getSession();
  if (!ctx) {
    throw new Error("Unauthorized");
  }
  return ctx;
}

/**
 * Require an admin caller for a Server Component / page. Redirects home when the
 * caller is not an admin (or when the DB is unavailable and the role cannot be
 * verified). A missing session lands at sign-in.
 */
export async function requireAdminOrRedirect(): Promise<AdminContext> {
  const ctx = await getSession();
  const reader = (id: string) => readRole(db, id);
  const outcome = await resolveAdmin(ctx, reader);

  if (!outcome.ok) {
    // A no-session caller is bounced to sign-in; any other denial bounces home.
    if (outcome.reason === "no-session") {
      redirect("/auth/sign-in");
    }
    redirect("/");
  }

  return { ...outcome.ctx, db };
}

/**
 * Require an admin caller for a Server Action. Throws "Database unavailable"
 * when the role cannot be verified, or "Forbidden" when the caller is not an
 * admin.
 */
export async function requireAdminOrThrow(): Promise<AdminContext> {
  const ctx = await getSession();
  const reader = (id: string) => readRole(db, id);
  const outcome = await resolveAdmin(ctx, reader);

  if (!outcome.ok) {
    if (outcome.reason === "no-session") {
      throw new Error("Unauthorized");
    }
    if (outcome.reason === "db-unavailable") {
      throw new Error("Database unavailable");
    }
    throw new Error("Forbidden");
  }

  return { ...outcome.ctx, db };
}
