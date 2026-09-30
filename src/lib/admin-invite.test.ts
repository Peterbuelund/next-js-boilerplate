// Runs against a real in-process Postgres (PGlite) with the generated migrations
// in ./drizzle applied, so the SQL — the conditional UPDATE, the advisory lock,
// the unique/FK constraints — is exercised, not mocked.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq, sql } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import * as schema from "./schema";
import {
  INVALID_INVITE_MESSAGE,
  INVITE_TTL_MS,
  createFirstAdmin,
  hashInviteToken,
  isInviteRedeemable,
  redeemAdminInvite,
  reissueAdminInvite,
  type AdminInviteDb,
  type IssuedInvite,
} from "./admin-invite";
import type { ActionResult } from "./action-result";

const client = new PGlite();
const pglite = drizzle(client, { schema });
const db = pglite as unknown as AdminInviteDb;

const T0 = new Date("2026-01-01T00:00:00.000Z");
const at = (ms: number) => () => new Date(T0.getTime() + ms);
const PASSWORD = "correct horse battery";
// Invites are issued at T0; redeem well inside the window.
const soon = { now: at(1000) };

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.data;
}

async function bootstrap(): Promise<IssuedInvite> {
  return unwrap(
    await createFirstAdmin(
      db,
      { email: "Admin@Example.com", name: "Ada Admin" },
      { now: at(0) },
    ),
  );
}

async function credentialHash(userId: string): Promise<string> {
  const [row] = await pglite
    .select({ password: schema.account.password })
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, "credential"),
      ),
    );
  return row!.password!;
}

beforeAll(async () => {
  await migrate(pglite, {
    migrationsFolder: path.resolve(__dirname, "../../drizzle"),
  });
});

beforeEach(async () => {
  await pglite.execute(
    sql`truncate ${schema.user}, ${schema.account}, ${schema.session}, ${schema.adminInvite} cascade`,
  );
});

afterAll(async () => {
  await client.close();
});

describe("createFirstAdmin", () => {
  it("creates a verified admin with a credential account and a 24h invite", async () => {
    const invite = await bootstrap();

    const [u] = await pglite
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, invite.userId));
    expect(u).toMatchObject({
      email: "admin@example.com",
      name: "Ada Admin",
      role: "admin",
      emailVerified: true,
    });
    // A random, discarded password — not the one the admin will choose.
    expect(
      await verifyPassword({ hash: await credentialHash(u.id), password: PASSWORD }),
    ).toBe(false);
    expect(invite.expiresAt.getTime() - T0.getTime()).toBe(INVITE_TTL_MS);
  });

  it("stores only the SHA-256 hash of the token", async () => {
    const invite = await bootstrap();
    const rows = await pglite.select().from(schema.adminInvite);

    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashInviteToken(invite.token));
    expect(JSON.stringify(rows)).not.toContain(invite.token);
  });

  it("refuses when an administrator already exists", async () => {
    await bootstrap();
    const result = await createFirstAdmin(db, {
      email: "second@example.com",
      name: "Second",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/administrator already exists/);
    expect(await pglite.select().from(schema.user)).toHaveLength(1);
  });

  it("lets only one of two concurrent bootstraps create an administrator", async () => {
    const results = await Promise.all([
      createFirstAdmin(db, { email: "one@example.com", name: "One" }),
      createFirstAdmin(db, { email: "two@example.com", name: "Two" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await pglite.select().from(schema.user)).toHaveLength(1);
  });

  it("refuses when the email already belongs to a (non-admin) user", async () => {
    await pglite.insert(schema.user).values({
      id: "existing",
      name: "Existing",
      email: "taken@example.com",
      role: "user",
    });
    const result = await createFirstAdmin(db, {
      email: "TAKEN@example.com",
      name: "Taken",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already exists/);
    expect(await pglite.select().from(schema.adminInvite)).toHaveLength(0);
  });
});

describe("invite expiry", () => {
  it("is redeemable just before 24h and not at the 24h boundary", async () => {
    const { token } = await bootstrap();

    expect(await isInviteRedeemable(db, token, { now: at(INVITE_TTL_MS - 1) })).toBe(true);
    expect(await isInviteRedeemable(db, token, { now: at(INVITE_TTL_MS) })).toBe(false);

    const expired = await redeemAdminInvite(
      db,
      { token, password: PASSWORD },
      { now: at(INVITE_TTL_MS) },
    );
    expect(expired).toEqual({ ok: false, error: INVALID_INVITE_MESSAGE });
  });

  it("redeems one millisecond before expiry", async () => {
    const { token } = await bootstrap();
    const result = await redeemAdminInvite(
      db,
      { token, password: PASSWORD },
      { now: at(INVITE_TTL_MS - 1) },
    );
    expect(result.ok).toBe(true);
  });
});

describe("redeemAdminInvite", () => {
  it("sets a password Better Auth verifies and revokes existing sessions", async () => {
    const { token, userId } = await bootstrap();
    await pglite.insert(schema.session).values({
      id: "s1",
      token: "session-token",
      userId,
      expiresAt: new Date(T0.getTime() + INVITE_TTL_MS * 7),
      updatedAt: T0,
    });

    const result = await redeemAdminInvite(db, { token, password: PASSWORD }, { now: at(1000) });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(
      await verifyPassword({ hash: await credentialHash(userId), password: PASSWORD }),
    ).toBe(true);
    expect(await pglite.select().from(schema.session)).toHaveLength(0);
  });

  it("is single-use: a second redemption fails and leaves the password alone", async () => {
    const { token, userId } = await bootstrap();
    expect((await redeemAdminInvite(db, { token, password: PASSWORD }, soon)).ok).toBe(true);

    const second = await redeemAdminInvite(db, { token, password: "another password" }, soon);

    expect(second).toEqual({ ok: false, error: INVALID_INVITE_MESSAGE });
    expect(
      await verifyPassword({ hash: await credentialHash(userId), password: PASSWORD }),
    ).toBe(true);
  });

  it("lets only one of two concurrent redemptions succeed", async () => {
    const { token } = await bootstrap();
    const results = await Promise.all([
      redeemAdminInvite(db, { token, password: PASSWORD }, soon),
      redeemAdminInvite(db, { token, password: PASSWORD }, soon),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("rejects an out-of-range password without burning the link", async () => {
    const { token } = await bootstrap();

    expect((await redeemAdminInvite(db, { token, password: "short" }, soon)).ok).toBe(false);
    expect((await redeemAdminInvite(db, { token, password: "x".repeat(129) }, soon)).ok).toBe(false);
    expect(await isInviteRedeemable(db, token, soon)).toBe(true);
  });

  it("rejects an unknown token", async () => {
    await bootstrap();
    const result = await redeemAdminInvite(db, { token: "not-a-real-token", password: PASSWORD }, soon);
    expect(result).toEqual({ ok: false, error: INVALID_INVITE_MESSAGE });
  });
});

describe("reissueAdminInvite", () => {
  it("invalidates the earlier link while the new one works", async () => {
    const first = await bootstrap();
    const second = unwrap(
      await reissueAdminInvite(db, { email: "admin@example.com" }, { now: at(1000) }),
    );

    expect(second.token).not.toBe(first.token);
    expect(second.userId).toBe(first.userId);
    expect(await isInviteRedeemable(db, first.token, { now: at(2000) })).toBe(false);

    const old = await redeemAdminInvite(db, { token: first.token, password: PASSWORD }, { now: at(2000) });
    expect(old).toEqual({ ok: false, error: INVALID_INVITE_MESSAGE });

    const fresh = await redeemAdminInvite(db, { token: second.token, password: PASSWORD }, { now: at(2000) });
    expect(fresh.ok).toBe(true);
  });

  it("refuses an email that is not an administrator", async () => {
    await pglite.insert(schema.user).values({
      id: "plain",
      name: "Plain",
      email: "user@example.com",
      role: "user",
    });

    expect((await reissueAdminInvite(db, { email: "user@example.com" })).ok).toBe(false);
    expect((await reissueAdminInvite(db, { email: "nobody@example.com" })).ok).toBe(false);
  });
});
