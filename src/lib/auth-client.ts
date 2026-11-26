import { createAuthClient } from "better-auth/react";

// No `baseURL`: the client talks to `/api/auth` on whatever origin the page was
// loaded from. Pinning it to `NEXT_PUBLIC_APP_URL` sent sign-in from any other
// host (a LAN address, another machine's name) to that device's own localhost.
export const authClient = createAuthClient();

export const { useSession, signIn, signOut, signUp } = authClient;
