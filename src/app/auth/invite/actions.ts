"use server";
import { db } from "@/lib/db";
import { redeemAdminInvite } from "@/lib/admin-invite";
import type { ActionResult } from "@/lib/action-result";

/** Redeem an administrator invite link by choosing a password.
 *
 *  Deliberately unauthenticated: possession of the unexpired, unused token IS
 *  the authorization, and `redeemAdminInvite` checks it atomically while
 *  consuming it. Expected failures (bad password length, invalid/expired/used
 *  link) come back as `ActionResult` values because Next redacts thrown Server
 *  Action messages in production — see `@/lib/action-result`. */
export async function redeemInviteAction(input: {
  token: string;
  password: string;
}): Promise<ActionResult> {
  // Server Action arguments are untrusted wire input; coerce before use.
  const token = typeof input?.token === "string" ? input.token : "";
  const password = typeof input?.password === "string" ? input.password : "";
  return redeemAdminInvite(db, { token, password });
}
