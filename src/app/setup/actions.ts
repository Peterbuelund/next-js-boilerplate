"use server";
import { provision, hasAdmin } from "@/lib/users";

/** Create the very first Admin. Re-checks hasAdmin server-side (never trusts
 *  the page guard) so it cannot run once the system is bootstrapped. */
export async function createFirstAdminAction(input: {
  name: string; email: string; password: string;
}): Promise<void> {
  if (await hasAdmin()) throw new Error("Setup is already complete");
  await provision({ ...input, role: "admin" });
}
