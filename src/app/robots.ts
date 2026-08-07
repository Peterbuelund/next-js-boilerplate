import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// This file convention makes Next.js serve a generated `/robots.txt`.
//
// The rules below are deny-heavy because this app has no public surface at all:
// every route is behind the entry cascade or an auth guard, so a crawler that
// follows one only ever gets a redirect to a sign-in screen. Disallowing those
// prefixes keeps the wasted fetches (and the empty search results they would
// produce) from happening in the first place.
//
// `robots.txt` is a request, not a control — it is fetched over the public
// internet by clients that may ignore it, so it is NOT a security boundary and
// nothing here should be read as one. The real enforcement is server-side in
// the auth guards; the per-page `robots: { index: false }` metadata is the
// second layer that catches crawlers which fetch anyway. Note also that listing
// a path here publishes its existence, which is why the rules stay at coarse
// prefixes rather than enumerating individual private routes.
//
// If this boilerplate ever grows genuinely public pages, flip the model: keep
// these disallows and add a `sitemap` pointing at the public URLs.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // `allow: "/"` first, then the specific disallows: the root allow keeps
      // the file from reading as a blanket site-wide block if a public page is
      // added later, while the longer, more specific disallow rules still win
      // for the paths they name under standard robots.txt precedence.
      allow: "/",
      disallow: ["/admin", "/setup", "/auth/", "/api/"],
    },
    // No `sitemap` key: there is no public sitemap to point at, and advertising
    // an empty or 404ing one is worse than advertising none.
    host: env.NEXT_PUBLIC_APP_URL,
  };
}
