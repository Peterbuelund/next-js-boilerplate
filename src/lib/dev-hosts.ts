// Extra hostnames the dev server may be opened on, from the comma-separated
// `DEV_HOSTS` variable (e.g. a LAN address or a machine name). Next only serves
// dev JS chunks and HMR to `localhost` and these hosts, and Better Auth only
// accepts sign-in from trusted origins, so a missing host breaks sign-in: the
// page renders but never hydrates, or the request is rejected.
//
// Read from `process.env` directly rather than `@/lib/env`, because
// `next.config.ts` imports this and runs outside Next's server bundle.
export function parseDevHosts(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
}

export const DEV_HOSTS = parseDevHosts(process.env.DEV_HOSTS);
