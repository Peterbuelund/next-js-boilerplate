// Server-only user operations. Talks to Better Auth and the database directly,
// so it must never reach the browser; the dependency-free schemas it re-exports
// live in `@/lib/user-schema`, which client code should import instead. The
// `server-only` import makes that boundary a build-time error rather than a
// convention.
import "server-only";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { userInputSchema, type UserInput } from "@/lib/user-schema";

// Re-exported so existing consumers can keep importing the user schema/types
// from `@/lib/users`; the canonical, dependency-free definitions now live in
// `@/lib/user-schema`.
export {
  userRoleSchema,
  userInputSchema,
  userUpdateSchema,
} from "@/lib/user-schema";
export type {
  UserRole,
  UserInput,
  UserUpdate,
} from "@/lib/user-schema";

/** True when at least one Admin exists — the "system is bootstrapped" signal
 *  the first-run /setup flow gates on. Throws when the DB is unavailable. */
export async function hasAdmin(): Promise<boolean> {
  if (!db) throw new Error("Database unavailable");
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "admin"))
    .limit(1);
  return Boolean(row);
}

/**
 * Provision a new user with a role. AUTHORIZATION-FREE: this module knows
 * nothing about sessions or who the caller is. Callers (the Admin surface and
 * the first-run setup flow) authorize first; this module validates its own
 * inputs.
 */
export async function provision(input: UserInput): Promise<{ id: string }> {
  const parsed = userInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }
  const { name, email, password, role } = parsed.data;

  if (!db) {
    throw new Error("Database unavailable");
  }

  // Intentionally omit `headers` and `asResponse` so Better Auth's Set-Cookie
  // response is discarded and any calling admin's session is preserved.
  const result = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  await db
    .update(user)
    .set({ role, emailVerified: true, updatedAt: new Date() })
    .where(eq(user.id, result.user.id));

  return { id: result.user.id };
}

/**
 * Set (or create) a user's credential password. AUTHORIZATION-FREE: callers are
 * responsible for any session/role checks before invoking this.
 */
export async function setPassword(
  userId: string,
  password: string,
): Promise<void> {
  if (typeof userId !== "string" || userId === "" || password.length < 8) {
    throw new Error("Invalid input");
  }

  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(password);
  const accounts = await ctx.internalAdapter.findAccounts(userId);
  const credential = accounts.find((a) => a.providerId === "credential");
  if (credential) {
    await ctx.internalAdapter.updatePassword(userId, hashedPassword);
  } else {
    await ctx.internalAdapter.createAccount({
      userId,
      providerId: "credential",
      accountId: userId,
      password: hashedPassword,
    });
  }
}
