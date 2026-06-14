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
      BETTER_AUTH_SECRET: "test-secret-value",
    },
  },
  // Mirror the tsconfig `@/*` -> `src/*` path alias so tests can import modules
  // that use the alias (e.g. the Access guards in `@/lib/auth-guards`).
  resolve: {
    alias: {
      "@": path.resolve(dir, "src"),
    },
  },
});
