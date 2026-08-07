# next-js-boilerplate

A clean Next.js boilerplate with authentication, role-based access, and an admin surface for user management — ready to extend.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (Radix UI + Base UI)
- **Database**: PostgreSQL via Drizzle ORM (`postgres-js`)
- **Auth**: Better Auth (email & password, role-based access)

> **Pinned versions**: TypeScript stays on 6 and ESLint on 9, though 7 and 10 are the
> current `latest`. Both ceilings come from `eslint-config-next`'s own dependencies —
> verified against TypeScript 7.0.2 and ESLint 10.8.0 (2026-08-05):
>
> - **TypeScript 7**: blocked by `typescript-eslint`, which caps its peer at
>   `typescript <6.1.0` ([#12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518)).
>   TS 7.0 ships no JavaScript compiler API at all — that lands in 7.1 — so `typescript-estree`
>   dies at load with `Cannot read properties of undefined (reading 'Cjs')`. Note that
>   `tsc --noEmit` and `next build` both pass on TS 7: [Next.js shells out to the project-local
>   `tsc` CLI](https://nextjs.org/docs/app/api-reference/config/typescript#using-typescript-7)
>   rather than calling the API, so it only needs to *run* the compiler. Type-aware lint rules
>   have to *query* the type graph, which is what the missing API provided. Linting is the only
>   thing that breaks.
> - **ESLint 10**: `typescript-eslint` now accepts `eslint ^10`, so it is no longer a blocker.
>   `eslint-plugin-react@7.37.5` — the latest publish — is: it calls `context.getFilename()`,
>   removed in ESLint 10, giving `contextOrFilename.getFilename is not a function`.
>
> Microsoft publishes `@typescript/typescript6`, a shim that serves the TS 6 API to tools
> while `tsc` runs the Go compiler. It does **not** work here: pnpm resolves the
> `typescript` peer from the root, so the shim can't be scoped to the linter alone
> (`overrides` and `packageExtensions` both fail to redirect it), and aliasing it as the
> root `typescript` makes `next build` reject it — Next requires the real package name.
>
> Revisit when TypeScript 7.1 ships the new API and `typescript-eslint` widens its peer
> range, and when `eslint-config-next` bumps `eslint-plugin-react` past 7.37.5.

## Features

- **Email & password auth** — sign-up, sign-in, forgot password, and reset password flows.
  > Password reset logs the reset URL to the server console. Wire up an email provider
  > in `src/lib/auth.ts` before going to production.
- **Role-based access** — every user is `user`, `admin`, or `disabled`. Roles are re-read
  from the database on each privileged request, so changes take effect immediately.
  Setting a user to `disabled` rejects sign-in and destroys existing sessions.
- **Readiness diagnostics** — when the database is unreachable or its schema hasn't been
  migrated, the error boundary shows a live checklist (backed by `/api/diagnostics`)
  naming the exact remediation to run, instead of a bare stack trace.
- **First-run setup** — on a fresh install with no admin, every page redirects
  to `/setup` where you create the first administrator interactively.
- **Admin panel** (`/admin`, admin-only) — add, edit, and delete users; change roles.

## Prerequisites

- Node.js 20+
- pnpm 11+
- PostgreSQL (a `docker-compose.yml` is included for local development)

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy the example env file and fill in the values (see Environment Variables below)
cp .env.example .env

# 3. Start a local Postgres instance
docker compose up -d

# 4. Apply database migrations
pnpm db:migrate

# 5. Start the dev server
pnpm dev
```

The app runs on `http://localhost:3000`.

## Environment Variables

All variables are documented in `.env.example` — copy it to `.env` and fill in the values.
Use `.env` (not `.env.local`) so the drizzle-kit CLI picks the values up too; Next.js reads
both, but drizzle-kit only auto-loads `.env`.
The contract is validated once at boot by `src/lib/env.ts`; a missing or malformed variable
crashes the process immediately (there is no `SKIP_ENV_VALIDATION` bypass).

- `POSTGRES_URL` — **required**. Postgres connection string.
- `BETTER_AUTH_SECRET` — **required**. Better Auth signing secret.
- `NEXT_PUBLIC_APP_URL` — **required in production**; defaults to `http://localhost:3000` in
  development. The app's public origin, used for auth callbacks and absolute links.

## Scripts

```bash
pnpm dev          # Start the dev server
pnpm build        # Production build
pnpm check        # Type-check (tsc) + lint (ESLint)
pnpm test         # Run tests (vitest)

pnpm db:generate  # Generate Drizzle migrations from schema.ts
pnpm db:migrate   # Apply pending migrations
```

> **Schema changes**: edit `src/lib/schema.ts`, then run `pnpm db:generate` followed
> by `pnpm db:migrate`. Do not use `db:push`.

## Project Structure

```
public/             # Statically served assets — empty by design (holds only .gitkeep).
                    # Must live at the repo root, not under src/, or Next.js will not
                    # serve its contents. Files here are exposed at the site root:
                    # public/logo.svg is fetched as /logo.svg.
src/
  app/
    admin/          # Admin user-management panel (admin-only)
    auth/           # Sign-in, sign-up, forgot/reset password pages
    setup/          # First-run setup page (creates the first admin)
    api/
      auth/         # Better Auth catch-all route handler
      diagnostics/  # Public readiness endpoint (backs the readiness checklist)
    page.tsx        # Dashboard / home
    layout.tsx      # Root layout
    error.tsx       # Route error boundary (renders the readiness checklist)
    global-error.tsx # Last-resort boundary — replaces the whole document
    not-found.tsx   # 404 page
  lib/
    auth.ts             # Better Auth server config
    auth-client.ts      # Better Auth browser client
    auth-guards.ts      # requireSession* / requireAdmin* access guards
    db.ts               # Drizzle client
    schema.ts           # Database schema
    user-schema.ts      # Shared user validation schemas (zod)
    users.ts            # User provisioning module
    env.ts              # Environment contract (validated once at boot)
    entry-cascade.ts    # Resolves setup → sign-in redirects
    system-readiness.ts # Runtime DB readiness probe
```

## Deployment

- **App**: Vercel, or any Node host (`pnpm build && pnpm start`).
- **Database**: Neon, Supabase, or self-hosted PostgreSQL. Set `POSTGRES_URL`,
  `BETTER_AUTH_SECRET`, and `NEXT_PUBLIC_APP_URL` in the host environment.

### Self-hosting (standalone output)

`next.config.ts` sets `output: "standalone"`, so `pnpm build` additionally emits
`.next/standalone`: a minimal `server.js` plus only the `node_modules` the app actually
reaches at runtime. A container image can ship that directory and run `node server.js`
instead of installing the full dependency tree.

> **Caveat**: the standalone output does **not** include `public/` or `.next/static` —
> Next.js assumes a CDN serves them. Without one, copy both into the runtime image
> yourself, or the server will boot but serve no static assets and no JS chunks:
>
> ```dockerfile
> COPY --from=builder /app/.next/standalone ./
> COPY --from=builder /app/public ./public
> COPY --from=builder /app/.next/static ./.next/static
> ```

Required secrets are read at build time as well as runtime (`src/lib/env.ts` parses
strictly with no bypass), so `POSTGRES_URL` and `BETTER_AUTH_SECRET` must be available
to the build step too.

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Better Auth](https://www.better-auth.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [shadcn/ui](https://ui.shadcn.com/)

## License

MIT
