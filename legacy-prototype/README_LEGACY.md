# LEGACY — DO NOT BUILD UI AGAINST THIS

**The current ACT III implementation is `apps/api/`.**

This folder contains an earlier JARVIS prototype, kept only for historical and reference purposes. Cursor must not treat it as the current backend, and must not modify it during the UI phase unless explicitly instructed.

## What this is

These files are the repo-root prototype from commit `1beaef1`:

| File | Root path in the repo |
|---|---|
| `src/` | `src/` |
| `test/` | `test/` |
| `ARCHITECTURE.md` | `ARCHITECTURE.md` |
| `README.md` | `README.md` |

`README.md` and `ARCHITECTURE.md` describe this prototype, **not** `apps/api`.

## Why it differs from the current backend

- **Contracts and states:** different contracts, lowercase state names, and no `EXTRACTING`, `intentCues` or `financial` state.
- **Out-of-scope integration code:** it includes vLLM client and env-config code, which is out of scope for the current phase.
- **Legacy root files:** the bundle-root `Dockerfile`, `tsconfig.json` and `.env.example`, and the root `package.json` scripts `start`, `typecheck`, `test` and `check`, all belong to this prototype.
  - In this bundle, the prototype's `src/` and `test/` were moved into `legacy-prototype/`, so those root scripts will not run here.
  - The Dockerfile was never built.

## Current backend

The current backend is `apps/api/`, run with the `api:*` scripts. Start with `../CURSOR_START_HERE.md`.
