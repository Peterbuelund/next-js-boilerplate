// Dependency-free constants shared by `@/lib/admin-invite` (server/CLI) and the
// invite form (client). Kept separate because `@/lib/admin-invite` pulls in
// `node:crypto` and database code that must not reach the browser bundle.

/** The one message every unusable link gets: unknown, expired, already used,
 *  or superseded. Distinguishing them would only help someone probing tokens. */
export const INVALID_INVITE_MESSAGE = "This invite link is invalid or has expired";
