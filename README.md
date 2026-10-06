# JARVIS ACT III — Final Pre-Kickoff Package

**Folder:** `JARVIS_ACTIII_FINAL_PREKICKOFF`  
**Accepted product:** `cursor/jarvis-ux-v3-ops` @ `6afb019`  
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
```

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
| `TESTING_GUIDE.md` | Bottom-up verification |
| `NETLIFY_DEPLOY.md` | Browser → SPA → `/cases` → function → engine |
| `FINAL_HANDOVER_SHA256.txt` | Hashes of important source/config/docs |

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
