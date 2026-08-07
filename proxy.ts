import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 Proxy (the v16 rename of `middleware.ts` — the file name is the
 * convention, do not rename it).
 *
 * This is a LATENCY OPTIMIZATION, never a security control. All it does is look
 * for the presence of a Better Auth session cookie and, when it is missing,
 * bounce the request straight to sign-in. That spares a plainly-unauthenticated
 * caller the full page render and the database round trips it would otherwise
 * pay for (`getSession`, then the live role re-read) before being redirected
 * anyway.
 *
 * What it deliberately does NOT do:
 *   - validate the session (the cookie is never verified, decrypted, or looked
 *     up; a forged or expired cookie sails straight through this check);
 *   - check the admin Role (the proxy has no database access at the edge).
 *
 * The real authorization boundary is `requireAdminOrRedirect` in
 * `src/lib/auth-guards.ts`, which re-reads Role from the database on every
 * request and denies when the session is absent, the role is not admin, or the
 * database is unreachable. Removing this file would change response times, not
 * who can see `/admin`.
 */
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  // Optimistic redirect — cookie existence only. Straight to `/auth/sign-in`
  // rather than `/`, because `/` is itself the entry gate and would only
  // re-redirect a session-less caller to sign-in: two hops for one decision.
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // The `/admin` tree only. Both patterns are needed: `/admin` matches the
  // section root exactly, and `/admin/:path*` covers every sub-route under it
  // (`/admin/users`, `/admin/users/123`, …) — a bare `/admin` matcher would let
  // any future sub-route skip the optimization entirely.
  //
  // `/` is intentionally absent: it is the entry-gate page (`enforceEntry`), so
  // a proxy redirect fired on `/` would be a redirect loop — and the gate
  // already resolves the session-less case itself. The other routes worth
  // protecting live behind server-side guards, not here.
  matcher: ["/admin", "/admin/:path*"],
};
