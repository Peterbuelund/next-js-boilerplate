// Server-only entry gate. The wired wrappers import `next/headers` (transitively
// via auth-guards) and `next/navigation`, so this module must never be imported
// into client components. The PURE `resolveEntry` and `reconcile` below have no
// such dependency and are freely testable.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-guards";
import { getSystemReadiness } from "@/lib/system-readiness";
import { hasAdmin } from "@/lib/users";

/**
 * The entry-point pages the cascade can land a request on. `/` is the app
 * itself (the "proceed" target); the other three are the gate pages.
 */
export type EntryPath = "/" | "/preflight" | "/setup" | "/auth/sign-in";

/**
 * Where a fresh request must be sent before it may enter the app. `null` means
 * "proceed": the system is ready, an admin exists, and the caller is signed in.
 * The redirect targets are exactly the gate pages (every EntryPath except `/`).
 */
export type Destination = Exclude<EntryPath, "/"> | null;

// The three probes the cascade consults, injected so the invariant can be
// tested without a DB, env, or Next headers.
type EntryProbes = {
  dbReady: () => Promise<boolean>;
  hasAdmin: () => Promise<boolean>;
  hasSession: () => Promise<boolean>;
};

// --- the destination invariant (PURE and testable) ------------------------

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

// --- the reconciliation invariant (PURE and testable) ---------------------

/**
 * Reconcile the resolved destination against the page actually being requested.
 * Returns `null` to mean "stay and render this page", otherwise the path to
 * redirect to. A `null` destination (proceed) maps to the app root `/`, so a
 * request that has already landed on the right page for the current system
 * state stays put and anything else bounces to where it belongs. Pure: no
 * `redirect`, no DB.
 */
export function reconcile(dest: Destination, path: EntryPath): EntryPath | null {
  const target: EntryPath = dest ?? "/";
  return target === path ? null : target;
}

// --- wired adapters (thin translators over the seams above) ---------------

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

/**
 * The single line every entry-point page runs before rendering: resolve the
 * current destination, reconcile it against this page's own path, and redirect
 * away when the page isn't where the request belongs. Returns (letting the page
 * render) only when the request should stay. `redirect` throws, so nothing runs
 * after it when a redirect is issued.
 */
export async function enforceEntry(path: EntryPath): Promise<void> {
  const target = reconcile(await entryDestination(), path);
  if (target) redirect(target);
}
