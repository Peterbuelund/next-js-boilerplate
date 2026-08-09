"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { user, session as sessionTable } from "@/lib/schema";
import { requireAdminOrThrow } from "@/lib/auth-guards";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import {
  provision,
  setPassword,
  userInputSchema,
  userUpdateSchema,
  type UserRole,
} from "@/lib/users";

// Re-exported so existing client consumers (add-user-dialog, edit-user-dialog)
// can keep importing `UserRole` from this module; the canonical type now lives
// in `@/lib/users`.
export type { UserRole } from "@/lib/users";

// Every action below returns `ActionResult` instead of throwing on expected
// failures, because Next.js redacts thrown Server Action messages in production
// builds — see the rationale at the top of `@/lib/action-result`. Only genuinely
// unexpected errors are left to propagate, so the error boundary still sees the
// faults that deserve it.

/**
 * Run the admin Access guard and translate its denial into a returned failure.
 *
 * `requireAdminOrThrow` signals denial by throwing a plain Error ("Unauthorized"
 * / "Forbidden" / "Database unavailable") — never by calling `redirect()` — so
 * catching around it here cannot swallow Next's redirect control-flow signal.
 * (Any future catch that *could* sit around a `redirect()` must re-throw it via
 * `unstable_rethrow` from `next/navigation`.)
 */
async function requireAdminOrFail(): Promise<
  ActionResult<Awaited<ReturnType<typeof requireAdminOrThrow>>>
> {
  try {
    return ok(await requireAdminOrThrow());
  } catch (err) {
    // The guard's own messages are written for humans and safe to render.
    return fail(err instanceof Error ? err.message : "Not authorized");
  }
}

/**
 * True when an error is the database (or Better Auth) rejecting a duplicate
 * email. Postgres reports it as SQLSTATE 23505 (unique_violation); Better Auth's
 * sign-up path catches that first and raises its own "user already exists"
 * APIError, so both shapes have to be recognised to keep this a modelled,
 * user-facing failure rather than a redacted 500.
 */
function isDuplicateEmail(err: unknown): boolean {
  if ((err as { code?: string })?.code === "23505") return true;
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  return message.includes("already exists") || message.includes("already in use");
}

export async function createUserAction(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminOrFail();
  if (!admin.ok) return admin;

  // Validated here as well as inside `provision` so a malformed submission comes
  // back as a rendered message instead of a thrown (and redacted) "Invalid input".
  const parsed = userInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input");
  }

  let created: { id: string };
  try {
    created = await provision(parsed.data);
  } catch (err) {
    if (isDuplicateEmail(err)) return fail("Email already in use");
    // Anything else is unexpected: let it reach the error boundary.
    throw err;
  }

  revalidatePath("/admin");

  return ok({ id: created.id });
}

export async function updateUserAction(input: {
  userId: string;
  name?: string;
  email?: string;
  role?: UserRole;
  newPassword?: string;
}): Promise<ActionResult> {
  const admin = await requireAdminOrFail();
  if (!admin.ok) return admin;
  const { user: currentUser, db } = admin.data;

  const parsed = userUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid input");
  }
  const data = parsed.data;

  if (
    data.userId === currentUser.id &&
    data.role !== undefined &&
    data.role !== "admin"
  ) {
    return fail("You cannot change your own role");
  }

  const updates: {
    name?: string;
    email?: string;
    role?: UserRole;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.email !== undefined) updates.email = data.email;
  if (data.role !== undefined) updates.role = data.role;

  if (
    data.name !== undefined ||
    data.email !== undefined ||
    data.role !== undefined
  ) {
    try {
      await db.update(user).set(updates).where(eq(user.id, data.userId));
    } catch (err) {
      if (isDuplicateEmail(err)) return fail("Email already in use");
      throw err;
    }
  }

  if (data.newPassword !== undefined) {
    await setPassword(data.userId, data.newPassword);
  }

  if (data.role === "disabled") {
    await db.delete(sessionTable).where(eq(sessionTable.userId, data.userId));
  }

  revalidatePath("/admin");

  return ok();
}

export async function deleteUserAction(input: {
  userId: string;
}): Promise<ActionResult> {
  const admin = await requireAdminOrFail();
  if (!admin.ok) return admin;
  const { user: currentUser, db } = admin.data;

  if (typeof input.userId !== "string" || input.userId === "") {
    return fail("Invalid input");
  }

  if (input.userId === currentUser.id) {
    return fail("You cannot delete your own account");
  }

  await db.delete(user).where(eq(user.id, input.userId));

  revalidatePath("/admin");

  return ok();
}
