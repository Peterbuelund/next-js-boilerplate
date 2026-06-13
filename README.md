# next-js-boilerplate

A clean Next.js boilerplate with authentication, role-based access, and an admin surface for user management — ready to extend.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (Radix UI + Base UI)
- **Database**: PostgreSQL via Drizzle ORM (`postgres-js`)
- **Auth**: Better Auth (email & password, role-based access)

## Features

- **Email & password auth** — sign-up, sign-in, forgot password, and reset password flows.
  > Password reset logs the reset URL to the server console. Wire up an email provider
  > (Resend, Nodemailer, …) in `src/lib/auth.ts` before going to production.
- **Role-based access** — every user is `user`, `admin`, or `disabled`. Roles are re-read
  from the database on each privileged request, so changes take effect immediately.
  Setting a user to `disabled` rejects sign-in and destroys existing sessions.
- **Bootstrap admin** — the first admin is provisioned at startup from
  `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` when no admin exists yet
  (see `src/lib/bootstrap-admin.ts`).
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
cp src/.env.example .env.local

# 3. Start a local Postgres instance
docker compose up -d

# 4. Generate and apply database migrations
pnpm db:generate
pnpm db:migrate

# 5. Start the dev server
pnpm dev
```

The app runs on `http://localhost:3000`.

## Environment Variables

Create `.env.local` at the project root with these variables:

```env
# Database (matches docker-compose.yml defaults)
POSTGRES_URL=postgresql://dev_user:dev_password@localhost:5432/postgres_dev

# Better Auth — generate a 32+ character random secret
BETTER_AUTH_SECRET=<your-random-secret>

# Public URL (used by Better Auth for callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Bootstrap admin — provisions the first admin at startup when none exists
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<admin-password>
ADMIN_NAME=<admin-display-name>

# App environment: "dev" enables the diagnostics endpoint (defaults to "prod")
ENV=dev
```

## Bootstrap Admin

On startup, if no admin user exists, the app creates one from the `ADMIN_EMAIL`,
`ADMIN_PASSWORD`, and `ADMIN_NAME` env vars. After that first run, these vars are
ignored — the admin is already in the database. To reset, delete the admin row and
restart.

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
src/
  app/
    admin/          # Admin user-management panel (admin-only)
    auth/           # Sign-in, sign-up, forgot/reset password pages
    api/
      auth/         # Better Auth catch-all route handler
      diagnostics/  # Dev-only diagnostics endpoint
    page.tsx        # Dashboard / home
    layout.tsx      # Root layout
  lib/
    auth.ts         # Better Auth server config
    auth-client.ts  # Better Auth browser client
    auth-guards.ts  # requireSession* / requireAdmin* access guards
    bootstrap-admin.ts  # First-admin provisioning logic
    db.ts           # Drizzle client
    schema.ts       # Database schema
    users.ts        # User provisioning module
```

## Deployment

- **App**: Vercel, or any Node host (`pnpm build && pnpm start`).
- **Database**: Neon, Supabase, or self-hosted PostgreSQL. Set `POSTGRES_URL`,
  `BETTER_AUTH_SECRET`, and `NEXT_PUBLIC_APP_URL` in the host environment.

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Better Auth](https://www.better-auth.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [shadcn/ui](https://ui.shadcn.com/)

## License

MIT
