# Domain Docs

How the engineering skills should consume this repo's domain documentation when
exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root: the domain language.
- **`docs/adr/`**: read the ADRs that touch the area you're about to work in.

This repo is **single-context** — one `GLOSSARY.md` and one `docs/adr/`, both at
the root. There is no `GLOSSARY-MAP.md` and no per-context ADR directory.

If any of these files don't exist, **proceed silently**. Don't flag their
absence; don't suggest creating them upfront. The `/domain-modeling` skill
(reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates
them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-agent-ownership.md
│   └── 0015-agent-runs-in-a-python-service.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor
proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`.

**In this repo that is a correctness rule, not a style preference.** `CLAUDE.md`
states it directly: "It lists the terms this project refuses as well as the ones
it uses; **using a refused word is a bug**." Nearly every term in `GLOSSARY.md`
carries an explicit `_Avoid_` list, and those lists are load-bearing — several
of them record a decision that an ADR also holds (a **Connection status** is not
a **Status**; a Workflow's **Run state** is not a **Status** either; "provider"
is reserved for the Better Auth sense). Reaching for a refused synonym silently
undoes that work.

`GLOSSARY.md` groups overloaded words under **Naming collisions**. Check those
distinctions before introducing a term that sounds like one already in use.

If the concept you need isn't in the glossary yet, that's a signal: either
you're inventing language the project doesn't use (reconsider) or there's a real
gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than
silently overriding:

> _Reopens the relevant ADR because the constraint has changed: …_
