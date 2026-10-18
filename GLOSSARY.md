# next-js-boilerplate

The domain language for this boilerplate: authenticated **Users** with **Roles**, and an **Admin** surface for managing them. Authentication is handled by Better Auth over a Postgres/Drizzle store.

## Language

### Identity & access

**User**:
An account in the system, persisted in the `user` table. Owned by Better Auth.
_Avoid_: member, account (reserve "Account" for the Better Auth sign-in record)

**Account**:
A Better Auth sign-in record linking a User to a method (the `credential` provider holds the hashed password; OAuth providers hold tokens).
_Avoid_: login, identity, credentials

**Role**:
A User's access level. Exactly one of **user**, **admin**, or **disabled**.
_Avoid_: permission, group, tier

**Admin**:
A User whose Role is `admin`. The only Role permitted to manage other Users.
_Avoid_: superuser, owner, root

**Disabled**:
A Role that denies access — sign-in is rejected and existing Sessions are destroyed.
_Avoid_: banned, suspended, inactive

**Session**:
Better Auth's proof that a request comes from a signed-in User. Role is re-read from the database on each privileged request rather than trusted from the Session.
_Avoid_: token, cookie, login

**Environment contract**:
The set of environment variables the app requires to boot, validated once at module load by `env.ts` (a zod parse). A missing or malformed _required_ variable (`POSTGRES_URL`, `BETTER_AUTH_SECRET`) crashes the process — it never degrades to a runtime check or a UI prompt. The single typed `env` export replaces every scattered `process.env.X!` / `Boolean(process.env.X)`. Required secrets are supplied at build time (e.g. via CI/workflow secrets), so the parse is strict everywhere — there is no build-time bypass. It covers _static configuration_ only: runtime database state is never pre-checked — an unreachable or unmigrated database throws out of whatever query hit it first, and the error boundary shows a generic error page.
_Avoid_: config check, env guard, settings

**First-run setup**:
The bootstrap state of a fresh install, before any Admin exists. The operator creates the first Admin from the command line (`pnpm create-admin <email> "<name>"`), never from the browser — an open setup form would let whoever reaches a fresh deployment first claim it. The CLI refuses if any Admin exists, creates the account (Role `admin`, verified email, a random password nobody learns), and prints an **Admin invite** link. While no Admin exists (`hasAdmin` returns false), all entry-point pages redirect to `/setup`, a purely informational "Not set up yet" card with no controls. Once an Admin exists, `/setup` redirects away.
_Avoid_: seed user, env admin, root admin, setup form

**Admin invite**:
A one-time link (`/auth/invite?token=…`) that lets an Admin choose their password in the browser. Only the token's SHA-256 hash is stored (`admin_invite` table); it expires after 24h and is single use. `pnpm create-admin <email> --reissue` issues a fresh one for an existing Admin and invalidates all earlier ones. After setting a password, the Admin signs in normally.
_Avoid_: magic link, reset link (reserved for forgot-password), setup token

**Access guard**:
A server-side check that gates a request by **Session** (`requireSession*`) or **Role** (`requireAdmin*`), always re-reading Role from the database. Each comes in two adapters: `*OrRedirect` for pages, `*OrThrow` for Server Actions / route handlers. `requireAdmin*` layers on `requireSession*`.
_Avoid_: middleware, auth check, gate

**Entry cascade**:
The ordered sequence of gates every entry-point page runs before rendering: **First-run setup** → **Sign in**. Resolved by two pure functions: `resolveEntry` maps the current application state to a destination in that fixed order (short-circuiting — with no Admin it never probes for a Session), and `reconcile` compares that destination against the requesting path to signal "stay" (render this page) or a redirect target. Each entry-point page is a one-line adapter: `enforceEntry(path)`. The cascade asks only about _application_ state: the **Environment contract** is guaranteed at boot, and database failures surface where they happen (the error boundary) rather than via an eager probe on every request.
_Avoid_: routing guard, middleware, redirect chain

### Provisioning

**Provision**:
To create a User and set its Role + verified email in one step (`users.provision`) — distinct from end-user **Sign up**. Authorization-free: the caller authorizes first (via an **Access guard**); the module validates its own inputs. Used by the Admin surface. (**First-run setup** creates its Admin directly in `admin-invite.ts`, since the CLI runs outside Next.js.)
_Avoid_: register, create-user (as a domain verb), seed

**Sign up**:
The end-user self-service path that creates a User with the default `user` Role.
_Avoid_: register, onboard

### Codebase provenance

**Vendored UI**:
Third-party UI primitives copied into the repo (shadcn/ui under `components/ui/` and shadcn hooks like `use-mobile`). Not authored here and not tracked for upstream re-pulls, so held to a lower lint bar than **Owned code** — left alone unless we have to touch them.
_Avoid_: third-party (these live in our tree), library, dependency

**Owned code**:
Code authored and maintained here (app routes, server actions, the Admin surface, platform components). Held to the full strict lint standard.
_Avoid_: our code, custom code

## Flagged ambiguities

- **"Create a user"** is overloaded: Better Auth's `signUpEmail` backs both end-user **Sign up** (default Role) and Admin **Provision** (chosen Role + verified email). Prefer **Provision** when a Role is assigned, **Sign up** for the self-service path.
- **"Provider"** is overloaded: in identity it is the Better Auth sign-in method (the `credential`/OAuth **Account** provider). Reserve "provider" for this Better Auth sense.

## Example dialogue

> **Dev:** When an Admin adds someone from the Admin panel, is that a sign up?
> **Domain:** No — sign up is what a visitor does to themselves and always lands as `user`. The Admin *provisions* the User: same Better Auth record underneath, but the Admin picks the Role and the email is pre-verified.
> **Dev:** And the first-run setup?
> **Domain:** Same idea — Role chosen, email pre-verified — but it happens from the command line (`pnpm create-admin`), not a Session, and only while there's no Admin yet. The new Admin gets an **Admin invite** link rather than a password; until then `/setup` just says "Not set up yet".
> **Dev:** If I set someone's Role to disabled?
> **Domain:** They lose access immediately — their Sessions are destroyed and the next sign-in is refused.
