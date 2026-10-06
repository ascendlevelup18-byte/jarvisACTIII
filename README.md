# JARVIS ACT III — Final Pre-Kickoff Package

**Canonical repo:** history `755b964 → … → f2219f3 (baseline lock) → 2537584 → 1beaef1`, then branch `claude/pre-kickoff-verification` (import commit `90c6f42` + hygiene commits)  
**Imported product:** `cursor/jarvis-ux-v3-ops` @ `6afb019` (Cursor's history was unrelated, so it was imported as content, not merged)  
**Lineage:** `1beaef1` (backend) → `17622c2` (UI truth) → `55049dc` (AMD scaffold) → `6afb019` (UX V3 + Netlify)

Duplicate-charge exception workflow with frozen fixture backend, Operations Command Center UI, Netlify deploy wiring, and pre-kickoff AMD provider scaffold. **AMD/vLLM adapters and Evolus are NOT IMPLEMENTED.**

## Requirements

- Node.js ≥ 24

## Quick start

```bash
npm ci
npm ci --prefix apps/web
npm run api:typecheck
npm run api:test
npm run api:bench:ci
npm run web:build
npm run web:test
```

`npm test` / `npm run check` run the API and web suites together. `npm run legacy:check` checks the old prototype in `legacy-prototype/` (reference only).

Local demo:

```bash
PORT=3000 npm run api:start          # terminal A
npm run web:dev                      # terminal B → http://127.0.0.1:43123
```

## Package documents

| Doc | Purpose |
|---|---|
| `FINAL_STATUS.md` | Honest IMPLEMENTED / VERIFIED / NOT IMPLEMENTED |
| `CONTINUATION_GUIDE.md` | 20 points for a new AI without chat history |
| `KICKOFF_PLAN.md` | K1–K4 → adapters → AMD → real-model bench → Evolus (**plan only**) |
| `docs/KICKOFF_IMPLEMENTATION_PACKAGE.md` | Exact kickoff contract: fixes, prompts, failure mapping, test matrix, smoke + bench plan |
| `docs/IMPLEMENTATION_STATUS.md` | Status of record (PROPOSED / IMPLEMENTED / VERIFIED) |
| `TESTING_GUIDE.md` | Bottom-up verification |
| `NETLIFY_DEPLOY.md` | Browser → SPA → `/cases` → function → engine |
| `FINAL_HANDOVER_SHA256.txt` | Hashes of the imported Cursor package as received (historical; git is now the integrity record) |
| `CURSOR_START_HERE.md`, `CURSOR_UI_BUILD_BRIEF.md`, `HANDOFF_MANIFEST.md` | Historical Cursor-era handoff docs |

Public benchmark figures are **pre-kickoff fixture results, not AMD / real-model results**, and the UI always shows them with that label.

## Demo scenarios

| Scenario | Expected |
|---|---|
| Valid duplicate | `RESOLVED` |
| Conflicting amount | `ESCALATED` |
| Already refunded | `CLOSED_NO_ACTION` |
| Adversarial message | `ESCALATED` |

## Truth labels

fixture AI · simulated gateway · synthetic data · **AMD not connected**

## Netlify

See `NETLIFY_DEPLOY.md` and `netlify.toml`. No duplicated business logic in functions.

## Kickoff

Do not start AMD/Evolus work from packaging alone. Follow `KICKOFF_PLAN.md` when authorized.
