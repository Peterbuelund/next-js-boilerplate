// Server-only entry gate. The wired wrapper imports `next/headers` (transitively
// via auth-guards), so this module must never be imported into client
// components. The PURE resolver below has no such dependency and is freely
// testable.
import { getSession } from "@/lib/auth-guards";
import { getSystemReadiness } from "@/lib/system-readiness";
import { hasAdmin } from "@/lib/users";

/**
 * Where a fresh request must be sent before it may enter the app. `null` means
 * "proceed": the system is ready, an admin exists, and the caller is signed in.
 */
export type Destination = "/preflight" | "/setup" | "/auth/sign-in" | null;

// The three probes the cascade consults, injected so the invariant can be
// tested without a DB, env, or Next headers.
type EntryProbes = {
  dbReady: () => Promise<boolean>;
  hasAdmin: () => Promise<boolean>;
  hasSession: () => Promise<boolean>;
};

// --- the invariant (PURE and testable) ------------------------------------

/**
 * The entry-gate invariant: a request may proceed only once the system is
 * ready, a first-run admin exists, and the caller has a session — checked in
 * that fixed order (Preflight -> First-run setup -> Sign in). Lazy and
 * short-circuiting: a down DB returns `/preflight` without ever probing for an
 * admin or a session. Pure: no `next/headers`, no DB, no env of its own.
 */
export async function resolveEntry(probes: EntryProbes): Promise<Destination> {
  if (!(await probes.dbReady())) return "/preflight";
  if (!(await probes.hasAdmin())) return "/setup";
  if (!(await probes.hasSession())) return "/auth/sign-in";
  return null; // fully ready + authenticated -> proceed to the app
}

// --- wired wrapper (thin translator over the seam above) ------------------

/**
 * Resolve the entry destination for the current request by building real
 * probes (system readiness, admin existence, live session) and feeding them to
 * `resolveEntry`. Returns the route to redirect to, or `null` to proceed.
 */
export async function entryDestination(): Promise<Destination> {
  return resolveEntry({
    dbReady: async () => (await getSystemReadiness()).ready,
    hasAdmin: () => hasAdmin(),
    hasSession: async () => (await getSession()) !== null,
  });
}
