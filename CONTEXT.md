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

**Bootstrap admin**:
The first Admin, provisioned from `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` at startup when no Admin exists yet.
_Avoid_: seed user, root admin

**Access guard**:
A server-side check that gates a request by **Session** (`requireSession*`) or **Role** (`requireAdmin*`), always re-reading Role from the database. Each comes in two adapters: `*OrRedirect` for pages, `*OrThrow` for Server Actions / route handlers. `requireAdmin*` layers on `requireSession*`.
_Avoid_: middleware, auth check, gate

### Provisioning

**Provision**:
To create a User and set its Role + verified email in one step (`users.provision`) — distinct from end-user **Sign up**. Authorization-free: the caller authorizes first (via an **Access guard**); the module validates its own inputs. Used by the Admin surface and the Bootstrap admin.
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

- **"Create a user"** is overloaded: Better Auth's `signUpEmail` backs both end-user **Sign up** (default Role) and Admin/Bootstrap **Provision** (chosen Role + verified email). Prefer **Provision** when a Role is assigned, **Sign up** for the self-service path.
- **"Provider"** is overloaded: in identity it is the Better Auth sign-in method (the `credential`/OAuth **Account** provider). Reserve "provider" for this Better Auth sense.

## Example dialogue

> **Dev:** When an Admin adds someone from the Admin panel, is that a sign up?
> **Domain:** No — sign up is what a visitor does to themselves and always lands as `user`. The Admin *provisions* the User: same Better Auth record underneath, but the Admin picks the Role and the email is pre-verified.
> **Dev:** And the Bootstrap admin at startup?
> **Domain:** Also a provision — same path, just driven by env vars instead of a Session, and it only runs when there's no Admin yet.
> **Dev:** If I set someone's Role to disabled?
> **Domain:** They lose access immediately — their Sessions are destroyed and the next sign-in is refused.
