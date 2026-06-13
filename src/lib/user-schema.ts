import { z } from "zod";

// Canonical user-input validation seam. Kept dependency-free (zod only) so
// provisioning, the admin update action, and the dialog all share one set of
// rules — and so the rules can be unit-tested without loading auth/db.

export const userRoleSchema = z.enum(["user", "admin", "disabled"]);
export type UserRole = z.infer<typeof userRoleSchema>;

// Behavior is preserved exactly: name/email must be non-empty after trimming
// but are NOT trimmed before storage, and the email rule only checks for "@"
// (we intentionally avoid `z.email()`, which is stricter).
export const userInputSchema = z.object({
  name: z.string().refine((s) => s.trim().length > 0),
  email: z.string().refine((s) => s.trim().length > 0 && s.includes("@")),
  password: z.string().min(8),
  role: userRoleSchema,
});
export type UserInput = z.infer<typeof userInputSchema>;

// Partial-update rules for the admin edit action, reusing the same field rules.
export const userUpdateSchema = z.object({
  userId: z.string().min(1),
  name: userInputSchema.shape.name.optional(),
  email: userInputSchema.shape.email.optional(),
  role: userRoleSchema.optional(),
  newPassword: z.string().min(8).optional(),
});
export type UserUpdate = z.infer<typeof userUpdateSchema>;
