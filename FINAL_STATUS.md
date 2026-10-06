# JARVIS ACT III — Final Pre-Kickoff Status

**Package:** `JARVIS_ACTIII_FINAL_PREKICKOFF`  
**Accepted product SHA:** `6afb019` (`cursor/jarvis-ux-v3-ops`)  
**Lineage:** backend baseline `1beaef1` → UI truth `17622c2` → AMD scaffold `55049dc` → UX V3 + Netlify `6afb019`  
**Packaging date:** 2026-10-06  
**Canonical repo (2026-10-06):** imported onto `master@1beaef1` as branch `claude/pre-kickoff-verification`, then hygiene fixes only: legacy root wiring moved into `legacy-prototype/`, dead components removed, benchmark figures labelled as pre-kickoff fixture results, docs refreshed. Re-verification: `docs/IMPLEMENTATION_STATUS.md`.  
**Scope of this document:** honest status only. No product changes in this packaging pass.

---

## IMPLEMENTED

- Duplicate-charge exception workflow (`apps/api`) with deterministic policy, evidence, state machine, simulated gateway, verification, audit
- Fixture request-understanding + fixture model adapters (default `JARVIS_AI_MODE=fixture`)
- Pre-kickoff AMD scaffold: generic OpenAI-compatible HTTP client, typed provider errors, response cleanup, env parse (`JARVIS_*`), startup guard that **refuses** `vllm` mode until adapters exist (no silent fixture fallback)
- Case Workspace → UX V3 Operations Command Center + Case Investigation UI (`apps/web`)
  - Nav: Operations, Cases, Activity, Benchmarks, System
  - Truth labels: fixture AI, simulated gateway, synthetic data, AMD not connected
  - Outcome-guard tests for RESOLVED / ESCALATED / CLOSED_NO_ACTION / FAILED / adversarial
- Frozen eval dataset + BASELINE-V1 pin + CI benchmark gate
- Netlify deploy wiring: `netlify.toml`, `netlify/functions/{cases,health}.ts` — Browser → SPA → `POST /cases` → function → existing case engine (isolated synthetic store per request; no duplicated business logic)

## VERIFIED (fresh copy of this package folder; Node v24.21.0)

| Check | Result |
|---|---|
| `npm ci` | exit 0 |
| `npm ci --prefix apps/web` | exit 0 |
| `npm run api:typecheck` | exit 0 |
| `npm run api:test` | **86 pass / 0 fail** |
| `npm run api:bench:ci` | **CI GATE PASSED** — 0 unsafe, 96.7% SRR, 100% escalation |
| `npm run web:build` | exit 0 |
| Dataset SHA-256 | `d5a8b4064b81bf8bfd69f95e8e0b6aa081529d63b053287a2761d3f4c9c28e47` |
| Four demos (fresh API) | RESOLVED / ESCALATED / CLOSED_NO_ACTION / ESCALATED — all PASS |

Note: install/tests ran on a fresh filesystem copy of this folder (agent-store fuse is too slow for `npm ci`); contents were identical to the packaged tree.

## NOT IMPLEMENTED

- Real AMD Developer Cloud / ROCm / vLLM inference
- `VllmRequestUnderstandingAdapter` / `VllmModelAdapter`
- Real-model benchmark (separate from BASELINE-V1 fixture pin)
- Evolus integration
- Production payment processor / durable multi-user case store
- Live SSE audit stream (UI replays final audit array)
- Local `api:start` does **not** serve `/api/health` (Netlify function does)

## NOT VERIFIED

- Live Netlify production deploy from *this exact* folder extract (wiring verified in UX V3 report; re-deploy not required for packaging)
- Real AMD endpoint connectivity
- Real-model safety numbers
- Evolus

## ARCHITECTURE

```text
apps/web (OpsShell)
  Operations / Cases / Activity / Benchmarks / System
        |
        | POST /cases  (Vite proxy locally; Netlify redirect in deploy)
        v
apps/api case-engine
  fixture understanding + fixture proposal
  deterministic policy / permissions / evidence
  simulated payment gateway
  verification + state machine + audit
```

Netlify path:

```text
Browser → Netlify SPA → POST /cases → Netlify Function
  → imports apps/api modules (unchanged core)
  → isolated synthetic CommerceStore per request
  → JSON case result
```

Health: `GET /api/health` → fixture / synthetic / simulated / `remoteModel: false`.

## FROZEN SAFETY

Do **not** alter deterministic core for cleanup or packaging:

- `apps/api/src/case-engine.ts`, `policy-engine.ts`, `evidence.ts`, `state-machine.ts`
- `apps/api/src/fixtures.ts`, `gateway.ts`, contracts, money
- `data/cases/duplicate-charge-eval.v1.json`
- `evals/baselines/BASELINE-V1.json`

Dataset SHA must remain:

`d5a8b4064b81bf8bfd69f95e8e0b6aa081529d63b053287a2761d3f4c9c28e47`

Fixture `api:bench:ci` must stay **0 unsafe**. Never present fixture metrics as AMD-model results.

## KNOWN LIMITATIONS

- Local in-memory API: after a successful refund, re-running valid-duplicate yields `CLOSED_NO_ACTION` until API restart (Netlify isolates per request)
- Legacy `LLM_MODE` / `VLLM_*` env example now lives in `legacy-prototype/`; **apps/api** uses `JARVIS_*` (`apps/api/.env.example`) — do not mix
- Activity / Benchmarks tabs are truthful but shallow vs Operations
- Audit stream is timed replay of final audit events, not live SSE
- Session case queue is browser-memory only

## NEXT COMPETITION STEPS

See `KICKOFF_PLAN.md` (do **not** execute in packaging). Order of truth:

1. Provider hardening (K1–K4)
2. vLLM adapters + prompts (no silent fixture fallback)
3. Controlled AMD/ROCm/vLLM smoke
4. Real-model bench with **0 unsafe** gate before any Evolus claim
5. Evolus only after real-model safety gate passes

Honest labels forever until then: **fixture / simulated / AMD not connected**.
