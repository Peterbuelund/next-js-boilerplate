import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      POSTGRES_URL: "postgresql://test:test@localhost:5432/test",
      BETTER_AUTH_SECRET: "test-secret-value-at-least-32-characters",
    },
  },
  // Mirror the tsconfig `@/*` -> `src/*` path alias so tests can import modules
  // that use the alias (e.g. the Access guards in `@/lib/auth-guards`).
  resolve: {
    alias: {
      "@": path.resolve(dir, "src"),
      // The server-only modules under `src/lib` import `server-only`, whose
      // exports map resolves to a module that THROWS on import unless the
      // `react-server` condition is set — which is how it turns a client-bundle
      // leak into a build error. Vitest externalizes the package, so Node's own
      // resolver picks the throwing entry point and every test touching those
      // modules dies at import. Point the specifier at the same empty module
      // Next.js's server bundle gets, so tests exercise the real server code.
      "server-only": path.resolve(dir, "node_modules/server-only/empty.js"),
    },
  },
});
