# CONTINUATION GUIDE — JARVIS ACT III Final Pre-Kickoff

For a new AI or developer with **no chat history**. Read this before changing code.

1. **Accepted product pin:** branch `cursor/jarvis-ux-v3-ops` @ git SHA `6afb019`. This folder is a packaging extract of that product. Do not “upgrade” from older handoffs (`17622c2`, `55049dc` alone) unless intentionally rolling back.

2. **Lineage (do not rewrite history claims):** backend content baseline `1beaef1` → UI truth `17622c2` → AMD scaffold `55049dc` → UX V3 + Netlify `6afb019`.

3. **Layout:** `apps/api` = fixture backend + provider scaffold; `apps/web` = Operations Command Center UI; `data/` = frozen eval dataset; `evals/` = baselines + results; `netlify/` = deploy functions; `docs/` = contracts/status/AMD skeleton; `legacy-prototype/` = reference only (not the current system).

4. **Node:** require Node.js ≥ 24 (`engines` in root `package.json`).

5. **First commands after extract:**
   ```bash
   npm ci
   npm ci --prefix apps/web
   npm run api:typecheck
   npm run api:test
   npm run api:bench:ci
   npm run web:build
   ```

6. **Dataset SHA must match exactly:**
   `d5a8b4064b81bf8bfd69f95e8e0b6aa081529d63b053287a2761d3f4c9c28e47`
   File: `data/cases/duplicate-charge-eval.v1.json`. If it drifts, stop.

7. **Fixture CI gate expectations:** ~86 API tests pass; `api:bench:ci` → 0 unsafe autonomous actions, 96.7% Safe Resolution Rate, 100% Correct Escalation Rate. Never weaken tests to greenwash.

8. **Default AI mode is fixture.** Env for API is `apps/api/.env.example` (`JARVIS_AI_MODE`, `JARVIS_MODEL_*`). Root `.env.example` is legacy (`LLM_MODE` / `VLLM_*`) — do not mix or assume it drives `apps/api`.

9. **`JARVIS_AI_MODE=vllm` currently refuses startup** (`AiStartupGuardError`). That is intentional. Never add silent fallback to fixture when mode is vllm.

10. **Frozen safety core — do not “cleanup” these for style:** `case-engine.ts`, `policy-engine.ts`, `evidence.ts`, `state-machine.ts`, `fixtures.ts`, `gateway.ts`, money/contracts, `data/`, `evals/baselines/`. Preserve byte-behavior unless a deliberate, reviewed safety change.

11. **Provider scaffold already exists** under `apps/api/src/provider/` (OpenAI-compatible client, errors, cleanup) plus `ai-config.ts` / `ai-mode.ts`. Kickoff builds adapters on top; do not replace with LangChain/OpenAI SDK unless explicitly directed.

12. **UI truth rules:** never show false success for ESCALATED / CLOSED_NO_ACTION / FAILED / adversarial. Outcome guards live in `apps/web/test/outcome-guards.test.ts` (`npm run web:test`). Labels must stay fixture / simulated / AMD not connected until real adapters + real-model bench pass.

13. **Four canonical demos** (`apps/web/src/fixtures/demo-scenarios.ts`):
    - valid-duplicate → `RESOLVED`
    - conflicting-amount → `ESCALATED`
    - already-refunded → `CLOSED_NO_ACTION`
    - prompt-injection → `ESCALATED`

14. **Local API state:** `npm run api:start` uses in-memory fixtures. After a successful refund, re-run of valid-duplicate becomes `CLOSED_NO_ACTION` until restart. Netlify function builds a fresh store per request.

15. **Local run:** Terminal A `PORT=3000 npm run api:start`; Terminal B `npm run web:dev` → `http://127.0.0.1:43123`. Vite proxies `/cases` to the API. Local API has no `/api/health` (Netlify does).

16. **Netlify:** see `NETLIFY_DEPLOY.md`. Architecture is Browser → SPA → `/cases` function → existing engine. Functions must **import** `apps/api` modules — do not duplicate policy/engine logic in the function layer.

17. **AMD / Evolus status:** NOT IMPLEMENTED. Do not claim VERIFIED AMD, real vLLM, or Evolus without running the real commands and real endpoint. Fixture bench numbers are not AMD numbers.

18. **Kickoff order is documented in `KICKOFF_PLAN.md`.** Execute only when authorized: K1–K4 provider hardening → adapters → AMD/ROCm/vLLM smoke → real-model bench with 0 unsafe → Evolus last. Do not skip the safety gate.

19. **Honesty docs:** `FINAL_STATUS.md` (what is/isn't done), `TESTING_GUIDE.md`, `NETLIFY_IMPLEMENTATION_STATUS.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/PRE_KICKOFF_AMD_KICKOFF_CHECKLIST.md`. Prefer updating status labels over inventing features.

20. **Packaging integrity:** `FINAL_HANDOVER_SHA256.txt` lists hashes for important sources. After material edits, regenerate it. Never ship `node_modules`, `.env` secrets, or build caches in handoff zips.
