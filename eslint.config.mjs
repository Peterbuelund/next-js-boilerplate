import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Skill chat per-conversation workspaces: machine-generated artifacts
    // (already gitignored). Never authored by hand, so never linted.
    "workspace/**",
  ]),
  // Vendored UI primitives (shadcn / Vercel AI Elements) were copied into the
  // repo, not authored here, and we don't track them for upstream re-pulls.
  // They're held to a lower bar than our own code: the strict hand-written-code
  // rules stay fully enabled everywhere else, but are switched off here so
  // vendored noise never blocks `pnpm lint`. Do NOT widen these globs to cover
  // code we actually own.
  {
    files: [
      "src/components/ai-elements/**",
      "src/components/ui/**",
      "src/hooks/use-mobile.ts",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/refs": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
