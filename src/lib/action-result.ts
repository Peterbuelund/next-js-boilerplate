// The result contract every Server Action in this app returns.
//
// WHY THIS EXISTS: Next.js redacts errors thrown out of a Server Action in a
// production build. The client never sees the message — it receives a generic
// "An error occurred in the Server Components render..." string plus a digest,
// and the real text is only written to the server log. That is exactly the
// right behaviour for unexpected faults (a stack trace or a DB error string is
// not something to hand a browser), but it destroys *expected*, user-facing
// outcomes: "Email already in use", "You cannot delete your own account",
// "Forbidden". Those read fine in `pnpm dev` and turn into a meaningless
// generic message in production.
//
// So the rule is: expected failures are VALUES, not exceptions. An action
// returns `{ ok: false, error }` and the message survives the network boundary
// untouched; only genuinely unexpected errors (bugs, unreachable infra) are
// left to throw, where redaction and the error boundary are what we want.
//
// This module must stay free of any server-only import: client components
// import `ActionResult` to type the values they receive back.

/** Either a successful action with its payload, or a modelled, user-facing
 *  failure carrying a message that is safe (and intended) to render. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Success. Called with no argument for the `ActionResult<void>` case, which
 *  keeps `return ok();` readable in actions that have nothing to hand back. */
export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

/** A modelled failure. `message` is shown to the user verbatim, so it must be
 *  written for them — never an internal error string passed straight through. */
export function fail(message: string): ActionResult<never> {
  return { ok: false, error: message };
}
