import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit `.next/standalone` — a self-contained build containing a minimal
  // `server.js` plus only the node_modules the app actually reaches at runtime,
  // traced from the compiled output. A container image can then ship that
  // directory instead of the full dependency tree, which is what makes
  // self-hosting (see docker-compose.yml) practical rather than enormous.
  //
  // Gotcha: the standalone output deliberately does NOT include `public/` or
  // `.next/static` — both are assumed to be served by a CDN. When there is no
  // CDN, a Dockerfile has to copy them in alongside the standalone directory:
  //
  //   COPY --from=builder /app/public ./public
  //   COPY --from=builder /app/.next/static ./.next/static
  //
  // Skipping that step yields a server that boots fine but serves no static
  // assets and no JS chunks.
  output: "standalone",
};

export default nextConfig;
