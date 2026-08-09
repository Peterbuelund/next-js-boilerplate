"use server";
import { provision, hasAdmin } from "@/lib/users";
import { ok, fail, type ActionResult } from "@/lib/action-result";

/** Create the very first Admin. Re-checks hasAdmin server-side (never trusts
 *  the page guard) so it cannot run once the system is bootstrapped.
 *
 *  Returns `ActionResult` rather than throwing on the "already bootstrapped"
 *  and duplicate-email cases: a thrown message is redacted by Next in
 *  production builds and would reach this form as an unusable generic string
 *  (see `@/lib/action-result`). A DB that is unreachable still throws, since
 *  that is an infrastructure fault for the error boundary, not something the
 *  person filling in this form can act on. */
export async function createFirstAdminAction(input: {
  name: string; email: string; password: string;
}): Promise<ActionResult> {
  if (await hasAdmin()) return fail("Setup is already complete");
  try {
    await provision({ ...input, role: "admin" });
  } catch (err) {
    // Better Auth rejects a sign-up whose email already has an account; that is
    // a correctable mistake, so it is reported rather than thrown.
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if ((err as { code?: string })?.code === "23505" || message.includes("already exists")) {
      return fail("Email already in use");
    }
    if (message === "invalid input") {
      return fail("Invalid input");
    }
    throw err;
  }
  return ok();
}
