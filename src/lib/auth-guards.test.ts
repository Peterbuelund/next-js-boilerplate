import { describe, it, expect } from "vitest";

import { resolveAdmin, DB_UNAVAILABLE } from "./auth-guards";
import type { UserRole } from "./user-schema";

// `resolveAdmin` is the pure heart of the admin Access guard: it decides
// access from a session ctx plus a Role *reader* (a live DB read), with no
// Next headers and no real DB. Only `ctx.user.id` is read, so a minimal cast
// fixture is enough.
const ctx = { user: { id: "u1" } } as Parameters<typeof resolveAdmin>[0];

// Build a stub reader that always reports the given result, standing in for the
// live DB read — a Role, `null` for "row is gone", or `DB_UNAVAILABLE` for
// "the read itself failed".
function reads(role: UserRole | null | typeof DB_UNAVAILABLE) {
  return () => Promise.resolve(role);
}

describe("resolveAdmin", () => {
  it("denies with 'no-session' when there is no ctx", async () => {
    expect(await resolveAdmin(null, reads("admin"))).toEqual({
      ok: false,
      reason: "no-session",
    });
  });

  it("denies with 'db-unavailable' when the reader signals DB_UNAVAILABLE", async () => {
    // The wired reader returns this signal when the live read throws (an
    // unreachable database). The Role cannot be known, so the guard fails
    // closed and denies rather than letting the error escape as a 500.
    expect(await resolveAdmin(ctx, reads(DB_UNAVAILABLE))).toEqual({
      ok: false,
      reason: "db-unavailable",
    });
  });

  it("denies with 'not-admin' when the reader returns 'user'", async () => {
    // Headline invariant: the decision comes from the reader (the DB), not the
    // Session. The ctx could claim anything; a non-admin Role from the live
    // read still denies access.
    expect(await resolveAdmin(ctx, reads("user"))).toEqual({
      ok: false,
      reason: "not-admin",
    });
  });

  it("grants access when the reader returns 'admin'", async () => {
    expect(await resolveAdmin(ctx, reads("admin"))).toEqual({
      ok: true,
      ctx,
    });
  });

  it("denies with 'not-admin' when the user row has vanished (reader returns null)", async () => {
    // Distinct from DB_UNAVAILABLE: the read succeeded, there is simply no row,
    // which is an ordinary denial rather than an infrastructure fault.
    expect(await resolveAdmin(ctx, reads(null))).toEqual({
      ok: false,
      reason: "not-admin",
    });
  });
});
