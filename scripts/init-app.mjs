/**
 * One-shot rebranding pass that turns this boilerplate into your own app.
 *
 * Usage:
 *   pnpm init:app
 *   pnpm init:app --dry-run    # print every change without writing anything
 *
 * Every prompt has a matching flag, so the whole thing can run unattended:
 *   pnpm init:app --name "Trailhead" --description "..." --no-git --yes
 * Flags that aren't supplied are prompted for, unless --yes takes the default.
 *
 * Plain ESM with no dependencies and no `tsx`, deliberately: this is the first
 * thing you run after cloning, and it must work even if `pnpm install` hasn't
 * finished (or failed). It also deletes itself on success, so it can't be run
 * twice and quietly re-mangle strings you've since edited by hand.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Parses `--flag value`, `--flag=value`, and boolean `--flag` / `--no-flag`. */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq !== -1) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else if (arg.startsWith("--no-")) {
      out[arg.slice(5)] = false;
    } else {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[arg.slice(2)] = next;
        i++;
      } else {
        out[arg.slice(2)] = true;
      }
    }
  }
  return out;
}

const ARGS = parseArgs(process.argv.slice(2));
const DRY_RUN = ARGS["dry-run"] === true;
const ASSUME_YES = ARGS.yes === true;

// The placeholder strings this script is responsible for retiring. Kept in one
// place so a `grep` for either literal lands here first.
const PLACEHOLDER_NAME = "Next.js Boilerplate";
const PLACEHOLDER_SLUG = "next-js-boilerplate";

const changed = [];

function readFile(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

function writeFile(rel, contents) {
  if (!DRY_RUN) writeFileSync(resolve(ROOT, rel), contents);
  changed.push(rel);
}

/**
 * Replace `find` with `replaceWith` in `rel`, asserting the string was actually
 * there. A silent no-op is the failure mode that matters here: the script would
 * report success while leaving "Next.js Boilerplate" in your <title>.
 */
function replaceIn(rel, find, replaceWith, { required = true } = {}) {
  const before = readFile(rel);
  if (!before.includes(find)) {
    if (required) {
      throw new Error(
        `Expected to find ${JSON.stringify(find.slice(0, 60))} in ${rel}, but it isn't there.\n` +
          `The file has probably been edited since this script was written — rebrand it by hand.`,
      );
    }
    return false;
  }
  writeFile(rel, before.split(find).join(replaceWith));
  return true;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 214); // npm's hard limit on package names.
}

function isValidSlug(value) {
  return /^[a-z0-9][a-z0-9._-]*$/.test(value);
}

// --- prompts ---------------------------------------------------------------

/**
 * `rl.question` rejects on Ctrl+D rather than resolving, which would otherwise
 * surface to the user as a raw "Aborted with Ctrl+D" error. Treat it as a clean
 * cancellation — nothing has been written by the time any prompt is answered.
 */
async function ask(rl, text) {
  try {
    return (await rl.question(text)).trim();
  } catch {
    console.log("\n\n  Cancelled — nothing was changed.\n");
    process.exit(130);
  }
}

async function prompt(rl, flag, question, fallback) {
  if (typeof ARGS[flag] === "string") return ARGS[flag];
  if (ASSUME_YES) return fallback || "";
  const suffix = fallback ? ` (${fallback})` : "";
  return (await ask(rl, `${question}${suffix}: `)) || fallback || "";
}

async function confirm(rl, flag, question, defaultYes) {
  if (typeof ARGS[flag] === "boolean") return ARGS[flag];
  if (ASSUME_YES) return defaultYes;
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = (await ask(rl, `${question} [${hint}]: `)).toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
}

// --- steps -----------------------------------------------------------------

function rebrandLayout(appName, description) {
  const rel = "src/app/layout.tsx";

  // The placeholder warning block exists to nag you into doing exactly what this
  // script just did, so it goes too — leaving it would send the next reader
  // grepping for a string that no longer exists.
  replaceIn(
    rel,
    `// The strings below are deliberately generic BOILERPLATE PLACEHOLDERS. Grep for
// "${PLACEHOLDER_NAME}" and replace every hit with the real product name, then
// rewrite the description — shipping with these values means shipping a site
// that describes itself as a template in search results and link previews.
// Exported because \`opengraph-image.tsx\` renders the same two strings onto the
// social card — a card that disagreed with the \`<title>\`/\`<meta description>\`
// would be a second place to forget during the rename above.`,
    `// Exported because \`opengraph-image.tsx\` renders the same two strings onto the
// social card — a card that disagreed with the \`<title>\`/\`<meta description>\`
// would be a second place to forget when these change.`,
  );

  replaceIn(rel, `export const APP_NAME = "${PLACEHOLDER_NAME}";`, `export const APP_NAME = ${JSON.stringify(appName)};`);

  replaceIn(
    rel,
    `export const APP_DESCRIPTION =
  "A Next.js starter with authentication, a Postgres/Drizzle data layer, and a themed shadcn/ui component set already wired together.";`,
    `export const APP_DESCRIPTION =\n  ${JSON.stringify(description)};`,
  );

  // Illustrative comment referencing the old name.
  replaceIn(rel, `// "Settings | ${PLACEHOLDER_NAME}" for free`, `// "Settings | ${appName}" for free`);
}

function rebrandDashboard(appName) {
  replaceIn(
    "src/app/(app)/page.tsx",
    `// \`title\` feeds the root layout's \`%s | ${PLACEHOLDER_NAME}\` template, so this
// renders as "Dashboard | ${PLACEHOLDER_NAME}".`,
    `// \`title\` feeds the root layout's \`%s | ${appName}\` template, so this
// renders as "Dashboard | ${appName}".`,
  );
}

function rebrandSidebar(appName, tagline) {
  const rel = "src/components/layout/app-sidebar.tsx";
  replaceIn(rel, `<span className="font-medium">${PLACEHOLDER_NAME}</span>`, `<span className="font-medium">${appName}</span>`);
  // The "Starter kit" subtitle underneath is placeholder text too.
  replaceIn(rel, `<span className="">Starter kit</span>`, `<span className="">${tagline}</span>`, {
    required: false,
  });
}

/**
 * CONTEXT.md is the domain-model doc and is worth keeping verbatim — only its
 * title and self-description name the boilerplate. Both replacements are
 * optional: this file is meant to be edited, so a miss here is not an error.
 */
function rebrandContextDoc(appName) {
  const rel = "CONTEXT.md";
  if (!existsSync(resolve(ROOT, rel))) return;
  replaceIn(rel, `# ${PLACEHOLDER_SLUG}\n`, `# ${appName}\n`, { required: false });
  replaceIn(rel, "The domain language for this boilerplate:", `The domain language for ${appName}:`, {
    required: false,
  });
}

function rebrandPackageJson(slug) {
  replaceIn("package.json", `"name": "${PLACEHOLDER_SLUG}",`, `"name": ${JSON.stringify(slug)},`);
}

/**
 * Copy .env.example to .env, substituting a real signing secret for the
 * placeholder. Never clobbers an existing .env — that file holds credentials
 * this script has no way to reconstruct.
 */
function writeEnv() {
  if (existsSync(resolve(ROOT, ".env"))) {
    return { skipped: "`.env` already exists — left untouched." };
  }
  const secret = randomBytes(32).toString("base64");
  const contents = readFile(".env.example").replace(
    /^BETTER_AUTH_SECRET=.*$/m,
    `BETTER_AUTH_SECRET=${secret}`,
  );
  if (!contents.includes(secret)) {
    return { skipped: "could not find BETTER_AUTH_SECRET in `.env.example` — copy it by hand." };
  }
  writeFile(".env", contents);
  return { skipped: null };
}

function writeReadme(appName, description) {
  writeFile(
    "README.md",
    `# ${appName}

${description}

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (Radix UI + Base UI)
- **Database**: PostgreSQL via Drizzle ORM (\`postgres-js\`)
- **Auth**: Better Auth (email & password, role-based access)

## Prerequisites

- Node.js 20+
- pnpm 11+
- PostgreSQL (a \`docker-compose.yml\` is included for local development)

## Setup

\`\`\`bash
pnpm install
docker compose up -d      # start local Postgres
pnpm db:migrate           # apply migrations
pnpm dev
\`\`\`

The app runs on \`http://localhost:3000\`. On a fresh database every route
redirects to \`/setup\`, where you create the first administrator.

## Environment Variables

All variables are documented in \`.env.example\`. Use \`.env\` (not \`.env.local\`) so
the drizzle-kit CLI picks them up too. The contract is validated once at boot by
\`src/lib/env.ts\`; a missing or malformed variable crashes the process immediately.

- \`POSTGRES_URL\` — **required**. Postgres connection string.
- \`BETTER_AUTH_SECRET\` — **required**. Better Auth signing secret (32+ chars).
- \`NEXT_PUBLIC_APP_URL\` — **required in production**; defaults to
  \`http://localhost:3000\` in development. Used for auth callbacks and absolute links.

## Scripts

\`\`\`bash
pnpm dev          # Start the dev server
pnpm build        # Production build
pnpm check        # Type-check (tsc) + lint (ESLint)
pnpm test         # Run tests (vitest)

pnpm db:generate  # Generate Drizzle migrations from schema.ts
pnpm db:migrate   # Apply pending migrations
\`\`\`

> **Schema changes**: edit \`src/lib/schema.ts\`, then run \`pnpm db:generate\`
> followed by \`pnpm db:migrate\`. Do not use \`db:push\`.

## Project Structure

\`\`\`
public/             # Statically served assets, exposed at the site root.
src/
  app/
    (app)/          # Authenticated app shell (dashboard, sidebar layout)
    admin/          # Admin user-management panel (admin-only)
    auth/           # Sign-in, sign-up, forgot/reset password pages
    setup/          # First-run setup page (creates the first admin)
    api/
      auth/         # Better Auth catch-all route handler
      diagnostics/  # Public readiness endpoint (backs the readiness checklist)
    layout.tsx      # Root layout — APP_NAME / APP_DESCRIPTION live here
    error.tsx       # Route error boundary (renders the readiness checklist)
  lib/
    auth.ts             # Better Auth server config
    auth-guards.ts      # requireSession* / requireAdmin* access guards
    db.ts               # Drizzle client
    schema.ts           # Database schema
    env.ts              # Environment contract (validated once at boot)
    entry-cascade.ts    # Resolves setup → sign-in redirects
    system-readiness.ts # Runtime DB readiness probe
\`\`\`

## Before Production

- **Email**: password reset currently logs the reset URL to the server console.
  Wire up an email provider in \`src/lib/auth.ts\`.
- **Env**: set \`POSTGRES_URL\`, \`BETTER_AUTH_SECRET\`, and \`NEXT_PUBLIC_APP_URL\`
  in the host environment.

## Deployment

- **App**: Vercel, or any Node host (\`pnpm build && pnpm start\`).
  \`next.config.ts\` sets \`output: "standalone"\`, and a \`Dockerfile\` is included.
- **Database**: Neon, Supabase, or self-hosted PostgreSQL.
`,
  );
}

function resetGitHistory() {
  if (DRY_RUN) return { ok: true };
  const git = (...args) => execFileSync("git", args, { cwd: ROOT, stdio: "pipe" });
  rmSync(resolve(ROOT, ".git"), { recursive: true, force: true });
  git("init", "-b", "main");
  git("add", "-A");
  // -c so this works before the user has a global git identity configured.
  execFileSync(
    "git",
    ["-c", "user.name=You", "-c", "user.email=you@example.com", "commit", "-m", "Initial commit"],
    { cwd: ROOT, stdio: "pipe" },
  );
  return { ok: true };
}

/** Remove the `init:app` entry and delete this file, so it can only run once. */
function selfDestruct() {
  const pkg = readFile("package.json");
  const withoutScript = pkg.replace(/^\s*"init:app": ".*",\n/m, "");
  if (withoutScript !== pkg) writeFile("package.json", withoutScript);
  if (!DRY_RUN) rmSync(resolve(ROOT, "scripts/init-app.mjs"), { force: true });
  changed.push("scripts/init-app.mjs (deleted)");
}

// --- main ------------------------------------------------------------------

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log(`\n  Turn this boilerplate into your own app.${DRY_RUN ? "  [dry run — nothing will be written]" : ""}\n`);

  // If the placeholder is already gone, this has run before (or the rename was
  // done by hand) and a second pass would only corrupt real strings.
  if (!readFile("src/app/layout.tsx").includes(`export const APP_NAME = "${PLACEHOLDER_NAME}"`)) {
    console.error("  This project has already been renamed — APP_NAME is no longer the placeholder.");
    console.error("  Nothing to do. Delete scripts/init-app.mjs if it's still around.\n");
    rl.close();
    process.exit(1);
  }

  let appName = "";
  while (!appName) {
    appName = await prompt(rl, "name", "  App name");
    if (!appName) {
      if (ASSUME_YES || typeof ARGS.name === "string") {
        throw new Error("An app name is required — pass --name \"Your App\".");
      }
      console.log("  An app name is required.");
    }
  }

  let slug = "";
  while (!slug) {
    slug = await prompt(rl, "slug", "  Package slug", slugify(appName));
    if (!isValidSlug(slug)) {
      if (ASSUME_YES || typeof ARGS.slug === "string") {
        throw new Error(`Invalid package slug: ${JSON.stringify(slug)}`);
      }
      console.log("  Slug must be lowercase and start with a letter or digit.");
      slug = "";
    }
  }

  const description = await prompt(rl, "description", "  One-line description", `${appName} — a web application.`);
  const tagline = await prompt(rl, "tagline", "  Sidebar subtitle", "Dashboard");

  const doEnv = await confirm(rl, "env", "  Generate .env with a fresh auth secret?", true);
  const doGit = await confirm(rl, "git", "  Reset git history (deletes .git, drops the origin remote)?", false);

  rl.close();

  console.log("");

  rebrandLayout(appName, description);
  rebrandDashboard(appName);
  rebrandSidebar(appName, tagline);
  rebrandPackageJson(slug);
  rebrandContextDoc(appName);
  writeReadme(appName, description);

  let envNote = "skipped by request";
  if (doEnv) {
    const { skipped } = writeEnv();
    envNote = skipped ?? "written with a fresh 32-byte BETTER_AUTH_SECRET";
  }

  selfDestruct();

  let gitNote = "left as-is (origin still points at the boilerplate)";
  if (doGit) {
    resetGitHistory();
    gitNote = "history reset — one 'Initial commit' on `main`, no remote";
  }

  console.log(`  ${DRY_RUN ? "Would update" : "Updated"}:`);
  for (const file of [...new Set(changed)]) console.log(`    - ${file}`);
  console.log(`\n  .env: ${envNote}`);
  console.log(`  git:  ${gitNote}`);

  console.log(`\n  Next:\n    docker compose up -d\n    pnpm db:migrate\n    pnpm dev\n`);
  if (doGit && !DRY_RUN) console.log(`  Then point at your own repo:\n    git remote add origin <your-repo-url>\n`);
}

main().catch((error) => {
  console.error(`\n  ${error.message}\n`);
  process.exit(1);
});
