# next-js-boilerplate

A clean Next.js starting point with authentication, role-based access, and user administration.
Next.js 16 + React 19, Drizzle on Postgres, Better Auth, Tailwind CSS 4 + shadcn/ui. pnpm.

## Read before you write

- `README.md` — setup, env vars, scripts, structure, deployment.
- `GLOSSARY.md` — the domain language. Read it before naming a new concept,
  adding a table, or putting a word in the UI. It lists the terms this project
  refuses as well as the ones it uses; using a refused word is a bug.
- `docs/adr/` — decisions already made, and why. Check it before changing agent
  ownership, installation types, or rate limiting. Write a numbered ADR when you
  make a decision of that size.
- `CODING-STANDARDS.md` — the conventions the code won't tell you until
  you've broken one. Read it before adding a Server Action, a `*-schema.ts`
  file, a model or embedding call, or any new module under `src/lib`.


## Finishing work

- `pnpm check` (tsc + eslint) and `pnpm test` must pass.
- Schema changes: edit `src/lib/schema.ts`, then `pnpm db:generate`, then `pnpm db:migrate`. 


## Agent skills

### Issue tracker

Issues live as GitHub issues on `Peterbuelund/next-js-boilerplate`, via the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, unchanged: `needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`.
See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root.
See `docs/agents/domain.md`.
