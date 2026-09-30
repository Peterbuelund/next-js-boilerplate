// Administrator bootstrap and one-time invite links.
//
// `pnpm create-admin` creates the first administrator from the command line and
// prints a link for them to choose a password in the browser; `/auth/invite`
// redeems that link. Both sides share this module.
//
// DELIBERATELY NOT `server-only`: the CLI (`scripts/create-admin.ts`) runs under
// plain Node via tsx, where the `server-only` package throws on import (it only
// resolves to an empty module under Next's `react-server` condition). For the
// same reason it takes the Drizzle handle as a parameter instead of importing
// `@/lib/db`, whose `@/lib/env` import validates secrets the CLI never needs.
// Nothing here is a secret or a browser hazard on its own, but it does hash
// passwords and write to the database, so client components still must not
// import it; the Next-side callers that do are themselves server-only.
//
// Security properties:
//   - the raw token exists only in the printed link; the database stores its
//     SHA-256 hash, so a leaked row cannot be redeemed;
//   - links expire after `INVITE_TTL_MS` and are consumed by a conditional
//     UPDATE, so two concurrent redemptions cannot both succeed;
//   - reissuing marks every earlier link for that user as used.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { hashPassword } from "better-auth/crypto";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import * as schema from "@/lib/schema";
import { INVALID_INVITE_MESSAGE } from "@/lib/admin-invite-messages";

export { INVALID_INVITE_MESSAGE };

/** Any Drizzle Postgres handle over this app's schema — postgres-js in the app
 *  and the CLI, PGlite in tests. */
export type AdminInviteDb = PgDatabase<PgQueryResultHKT, typeof schema>;

/** How long an invite link stays redeemable. */
export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

// Mirrors `emailAndPassword.minPasswordLength` / `maxPasswordLength` in
// `@/lib/auth`, which cannot be imported here (it is server-only).
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;


// Serializes bootstrap runs: two concurrent `create-admin` invocations would
// otherwise both see "no admin yet" and both create one. Transaction-scoped, so
// it is released on commit/rollback even if the process dies.
const BOOTSTRAP_LOCK_KEY = sql`hashtext('admin-invite:bootstrap')`;

/** A freshly issued invite. `token` is the raw secret for the link and is
 *  never persisted. */
export type IssuedInvite = {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
};

type Clock = { now?: () => Date };

/** SHA-256 (hex) of a raw invite token — the only form that is stored. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Build the browser URL for a raw token. */
export function inviteUrl(baseUrl: string, token: string): string {
  const url = new URL("/auth/invite", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

// Better Auth lowercases emails on sign-up and sign-in, so match that here or
// the created administrator could never sign in with a mixed-case address.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Insert a new invite row for `userId` inside `tx`, returning the raw token.
async function insertInvite(
  tx: AdminInviteDb,
  userId: string,
  now: Date,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  await tx.insert(schema.adminInvite).values({
    userId,
    tokenHash: hashInviteToken(token),
    expiresAt,
    createdAt: now,
  });
  return { token, expiresAt };
}

/**
 * Create the first administrator and an invite link for them. Refuses when any
 * administrator already exists or the email already belongs to a user.
 *
 * The account gets a random password that is hashed and immediately discarded,
 * so the only way in is the invite link (or a later password reset).
 */
export async function createFirstAdmin(
  db: AdminInviteDb,
  input: { email: string; name: string },
  { now = () => new Date() }: Clock = {},
): Promise<ActionResult<IssuedInvite>> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!email.includes("@")) return fail("A valid email address is required");
  if (!name) return fail("A name is required");

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${BOOTSTRAP_LOCK_KEY})`);

    const [existingAdmin] = await tx
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.role, "admin"))
      .limit(1);
    if (existingAdmin) {
      return fail(
        "An administrator already exists. Use --reissue to send an existing administrator a new link.",
      );
    }

    const [existingUser] = await tx
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);
    if (existingUser) return fail(`A user with email ${email} already exists`);

    const at = now();
    const userId = randomUUID();
    await tx.insert(schema.user).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "admin",
      createdAt: at,
      updatedAt: at,
    });
    await tx.insert(schema.account).values({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: await hashPassword(randomBytes(32).toString("base64url")),
      createdAt: at,
      updatedAt: at,
    });

    const invite = await insertInvite(tx, userId, at);
    return ok({ userId, email, ...invite });
  });
}

/**
 * Issue a fresh invite link for an EXISTING administrator, invalidating every
 * earlier link for them. Refuses when the email is not an administrator.
 */
export async function reissueAdminInvite(
  db: AdminInviteDb,
  input: { email: string },
  { now = () => new Date() }: Clock = {},
): Promise<ActionResult<IssuedInvite>> {
  const email = normalizeEmail(input.email);

  return db.transaction(async (tx) => {
    const [admin] = await tx
      .select({ id: schema.user.id, role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);
    if (!admin || admin.role !== "admin") {
      return fail(`No administrator with email ${email}`);
    }

    const at = now();
    await tx
      .update(schema.adminInvite)
      .set({ usedAt: at })
      .where(
        and(
          eq(schema.adminInvite.userId, admin.id),
          isNull(schema.adminInvite.usedAt),
        ),
      );

    const invite = await insertInvite(tx, admin.id, at);
    return ok({ userId: admin.id, email, ...invite });
  });
}

// The predicate for "this token can still be redeemed right now". The user
// must also still be an administrator, so demoting someone kills their link.
function redeemable(tokenHash: string, at: Date) {
  return and(
    eq(schema.adminInvite.tokenHash, tokenHash),
    isNull(schema.adminInvite.usedAt),
    gt(schema.adminInvite.expiresAt, at),
    inArray(
      schema.adminInvite.userId,
      sql`(select ${schema.user.id} from ${schema.user} where ${schema.user.role} = 'admin')`,
    ),
  );
}

/** True when `token` is currently redeemable. Read-only: lets the invite page
 *  show the "invalid link" state up front instead of after a submit. */
export async function isInviteRedeemable(
  db: AdminInviteDb,
  token: string,
  { now = () => new Date() }: Clock = {},
): Promise<boolean> {
  if (!token) return false;
  const [row] = await db
    .select({ id: schema.adminInvite.id })
    .from(schema.adminInvite)
    .where(redeemable(hashInviteToken(token), now()))
    .limit(1);
  return Boolean(row);
}

/**
 * Redeem an invite: consume the link, set the administrator's password, and
 * revoke their existing sessions — all in one transaction. The conditional
 * UPDATE ... RETURNING is the single-use guarantee: of two concurrent
 * redemptions only one matches `used_at IS NULL`.
 *
 * The password is validated BEFORE the link is touched, so a typo in a short
 * password does not burn the link.
 */
export async function redeemAdminInvite(
  db: AdminInviteDb,
  input: { token: string; password: string },
  { now = () => new Date() }: Clock = {},
): Promise<ActionResult> {
  const { token, password } = input;
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return fail(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
    );
  }
  if (!token) return fail(INVALID_INVITE_MESSAGE);

  // Hash outside the transaction: scrypt is deliberately slow and there is no
  // reason to hold row locks while it runs.
  const passwordHash = await hashPassword(password);

  return db.transaction(async (tx) => {
    const at = now();
    const [consumed] = await tx
      .update(schema.adminInvite)
      .set({ usedAt: at })
      .where(redeemable(hashInviteToken(token), at))
      .returning({ userId: schema.adminInvite.userId });
    if (!consumed) return fail(INVALID_INVITE_MESSAGE);

    const updated = await tx
      .update(schema.account)
      .set({ password: passwordHash, updatedAt: at })
      .where(
        and(
          eq(schema.account.userId, consumed.userId),
          eq(schema.account.providerId, "credential"),
        ),
      )
      .returning({ id: schema.account.id });
    if (updated.length === 0) {
      await tx.insert(schema.account).values({
        id: randomUUID(),
        userId: consumed.userId,
        accountId: consumed.userId,
        providerId: "credential",
        password: passwordHash,
        createdAt: at,
        updatedAt: at,
      });
    }

    await tx
      .delete(schema.session)
      .where(eq(schema.session.userId, consumed.userId));

    return ok();
  });
}
