"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { user, session as sessionTable } from "@/lib/schema";
import { requireAdminOrThrow } from "@/lib/auth-guards";
import {
  provision,
  setPassword,
  userUpdateSchema,
  type UserRole,
} from "@/lib/users";

// Re-exported so existing client consumers (add-user-dialog, edit-user-dialog)
// can keep importing `UserRole` from this module; the canonical type now lives
// in `@/lib/users`.
export type { UserRole } from "@/lib/users";

export async function createUserAction(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<{ id: string }> {
  await requireAdminOrThrow();

  const result = await provision(input);

  revalidatePath("/admin");

  return { id: result.id };
}

export async function updateUserAction(input: {
  userId: string;
  name?: string;
  email?: string;
  role?: UserRole;
  newPassword?: string;
}): Promise<void> {
  const { user: currentUser, db } = await requireAdminOrThrow();

  const parsed = userUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid input");
  }
  const data = parsed.data;

  if (
    data.userId === currentUser.id &&
    data.role !== undefined &&
    data.role !== "admin"
  ) {
    throw new Error("You cannot change your own role");
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
      const code = (err as { code?: string }).code;
      if (code === "23505") throw new Error("Email already in use");
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
}

export async function deleteUserAction(input: { userId: string }): Promise<void> {
  const { user: currentUser, db } = await requireAdminOrThrow();

  if (typeof input.userId !== "string" || input.userId === "") {
    throw new Error("Invalid input");
  }

  if (input.userId === currentUser.id) {
    throw new Error("You cannot delete your own account");
  }

  await db.delete(user).where(eq(user.id, input.userId));

  revalidatePath("/admin");
}
