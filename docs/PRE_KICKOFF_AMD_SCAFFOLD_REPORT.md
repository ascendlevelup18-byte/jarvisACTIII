---
cursor:
  subagentId: "bc-71ed2925-2376-59ad-9079-0e4c06bc54bc"
---

# Pre-kickoff AMD Scaffold Report

**Branch:** `cursor/pre-kickoff-amd-scaffold-54bc`  
**Base:** `17622c2` (`fix(web): U1–U3 UI truth — structured verdicts and real stop stage`)  
**Worktree:** `/tmp/jarvis-pre-kickoff-amd`  
**Date:** 2026-10-05  
**Scope:** Generic OpenAI-compatible client / env / startup guard / docs only. **Stop for review. No kickoff adapter work.**

## FILES ADDED

| Path | Role |
|---|---|
| `apps/api/src/provider/errors.ts` | Typed provider error categories + secret redaction |
| `apps/api/src/provider/response-cleanup.ts` | Generic code-fence / reasoning-block strip |
| `apps/api/src/provider/openai-compatible-client.ts` | Native-fetch OpenAI-compatible HTTP client |
| `apps/api/src/provider/index.ts` | Public provider barrel |
| `apps/api/src/ai-config.ts` | `JARVIS_AI_*` env parse/validate |
| `apps/api/src/ai-mode.ts` | Fixture/vllm declaration + pre-kickoff startup guard |
| `apps/api/.env.example` | Env example for apps/api |
| `apps/api/test/fake-openai-server.ts` | Fake local OpenAI-compatible HTTP server |
| `apps/api/test/openai-compatible-client.test.ts` | Generic client + cleanup + redact tests |
| `apps/api/test/ai-config.test.ts` | Config + startup-guard tests |
| `docs/AMD_DEPLOYMENT_RUNBOOK.md` | AMD deployment/runbook skeleton |
| `docs/PRE_KICKOFF_AMD_KICKOFF_CHECKLIST.md` | Exact kickoff implementation checklist |
| `docs/PRE_KICKOFF_AMD_SCAFFOLD_REPORT.md` | This report (repo copy) |

## FILES MODIFIED

| Path | Change |
|---|---|
| `apps/api/src/main.ts` | Load AI config; assert pre-kickoff guard; log safe summary. Still wires fixture adapters only. |
| `docs/IMPLEMENTATION_STATUS.md` | Status labels: scaffold IMPLEMENTED; adapters/AMD-live NOT IMPLEMENTED |
| `README.md` | Note default fixture mode and vllm refuse behavior |

**Unchanged (verified `git diff --exit-code 17622c2`):** `data/`, `evals/`, `apps/api/src/policy-engine.ts`, `evidence.ts`, `state-machine.ts`, `case-engine.ts`, `model-adapter.ts`, `request-understanding.ts`, entire `apps/web/`.

## WHAT WAS IMPLEMENTED

1. **Generic OpenAI-compatible HTTP client** (`OpenAICompatibleClient`): `baseUrl`, `model`, optional `apiKey`, `timeoutMs`, optional `maxResponseBytes`; native `fetch`; POST `{baseUrl}/chat/completions`; no JARVIS prompts.
2. **Typed errors:** `CONFIG_ERROR`, `CONNECTION_ERROR`, `TIMEOUT`, `HTTP_4XX`, `HTTP_5XX`, `INVALID_JSON`, `INVALID_PROVIDER_RESPONSE`, `RESPONSE_TOO_LARGE`, `UNKNOWN_PROVIDER_ERROR`. Messages run through `redactSecrets`; API keys never logged via `aiConfigSummary`.
3. **Generic response cleanup:** strip markdown code fences; optional `<think>` / `<reasoning>` / `<reason>` strip. No JARVIS schema interpretation.
4. **Fake local server** for client tests (200, malformed JSON, hang/timeout, connection refusal, 400/401/429/500/503, unexpected shape, large body, text-around-JSON, code-fence, reasoning wrapper, auth echo).
5. **Generic client + config tests** (27 new tests; suite total 86 pass).
6. **Env config:** `JARVIS_AI_MODE=fixture|vllm` (default fixture); `JARVIS_MODEL_BASE_URL`, `JARVIS_MODEL_NAME`, `JARVIS_MODEL_API_KEY` (optional), `JARVIS_MODEL_TIMEOUT_MS` (invalid fails). Fixture needs no endpoint; vllm requires base URL + model name.
7. **Mode declaration** via `declareAiMode` (`fixtureAdaptersReady` / `vllmAdaptersReady=false` in this build).
8. **Startup guard:** fixture starts normally; `JARVIS_AI_MODE=vllm` throws `AiStartupGuardError` naming missing adapters and stating no fixture fallback.
9. **Docs:** env example, AMD runbook skeleton, status labels, kickoff checklist, explicit NOT-implemented list.

## WHAT IS DELIBERATELY NOT IMPLEMENTED

- `VllmRequestUnderstandingAdapter` / `VllmModelAdapter`
- JARVIS understanding or decision prompts
- Schema-to-model mapping / structured-output wiring into adapters
- Real AMD endpoint calls, live vLLM, real-model benchmark, Evolus
- Changes to policy / evidence / state machine / case-engine business behavior
- Changes to `data/`, `evals/`, UI truth-fix behavior
- LangChain / LangGraph / OpenAI SDK / agent frameworks / streaming / tool-calling / agent loop
- Silent fallback to fixture when `JARVIS_AI_MODE=vllm`

## CONFIG

| Variable | Default | Notes |
|---|---|---|
| `JARVIS_AI_MODE` | `fixture` | `fixture` \| `vllm` |
| `JARVIS_MODEL_BASE_URL` | unset | Required for vllm; valid URL |
| `JARVIS_MODEL_NAME` | unset | Required for vllm |
| `JARVIS_MODEL_API_KEY` | unset | Optional; never logged |
| `JARVIS_MODEL_TIMEOUT_MS` | `30000` | Positive integer or fail |
| `PORT` | `3000` | Unchanged API listen port |

See `apps/api/.env.example`.

## ERROR MODEL

`ProviderError` with `category` + optional `statusCode`. HTTP 4xx → `HTTP_4XX`; 5xx → `HTTP_5XX`. Fetch timeouts → `TIMEOUT`. Connection failures (ECONNREFUSED / fetch failed chain) → `CONNECTION_ERROR`. Oversize bodies → `RESPONSE_TOO_LARGE`. Missing/invalid provider JSON shape → `INVALID_JSON` / `INVALID_PROVIDER_RESPONSE`. Constructor misconfig → `CONFIG_ERROR`.

## FAKE SERVER TEST RESULTS

Ran under Node v24.21.0:

```
apps/api/test/openai-compatible-client.test.ts + ai-config.test.ts
ℹ tests 27
ℹ pass 27
ℹ fail 0
```

Covered scenarios: 200 OK, malformed JSON, hang→TIMEOUT, connection→CONNECTION_ERROR, 400/401/429, 500/503, unexpected shape, large response, text-around-JSON (raw, no schema parse), API key Bearer send without leak, CONFIG_ERROR, cleanup fences/reasoning, redactSecrets, fixture default, invalid timeout, vllm requires URL+name, vllm startup refuse (no fallback).

## EXISTING TEST RESULTS

```
npm run api:typecheck  → exit 0
npm run api:test       → 86 pass / 0 fail
  (prior slice: 59; scaffold adds 27)
npm ci --prefix apps/web && npm run web:build → exit 0
```

Prior behavioral suite (policy/engine/server/state/benchmark/review) all still green.

## BENCHMARK RESULTS

`npm run api:bench:ci` → **CI GATE PASSED**

| Metric | Value |
|---|---|
| Unsafe autonomous actions | **0** |
| Safe Resolution Rate | **96.7%** (29/30) |
| Correct Escalation Rate | **100%** (20/20) |
| Conservative escalations | 1 (DC-S04) |

## DATASET HASH

`data/cases/duplicate-charge-eval.v1.json` SHA-256:

`d5a8b4064b81bf8bfd69f95e8e0b6aa081529d63b053287a2761d3f4c9c28e47`

Matches BASELINE-V1 pin. `evals/results/duplicate-charge-eval.v1.json` byte-identical to base (`b3e86b91409157611384757d4faf6821e74cd65bbdf190457e9ff44bcbf7e26a`).

## BACKEND BEHAVIOR UNCHANGED PROOF

1. `git diff --exit-code 17622c2 -- data/ evals/ apps/api/src/policy-engine.ts apps/api/src/evidence.ts apps/api/src/state-machine.ts apps/api/src/case-engine.ts apps/api/src/model-adapter.ts apps/api/src/request-understanding.ts apps/web/` → **exit 0**
2. `main.ts` only adds config load + startup guard + safe log before identical fixture wiring
3. Benchmark metrics identical to truth-fixed Pass 2 expectations (0 unsafe, 96.7% SRR, 100% escalation)
4. Dataset hash unchanged

## RISKS

- Kickoff must replace the vllm refuse path with real adapters; forgetting the “no silent fallback” rule would violate the contract.
- `AbortSignal.timeout` / `AbortSignal.any` require modern Node (≥24 per `engines`).
- Fake-server hang tests depend on short client timeouts; flaky environments with extreme scheduling delay are unlikely but possible.
- Generic cleanup does not extract JSON embedded in prose; adapters must decide how to handle text-around-JSON at kickoff.
- The legacy `.env.example` (`LLM_MODE` / `VLLM_*`) now lives in `legacy-prototype/`; apps/api uses `JARVIS_*` — do not mix them.

## EXACT KICKOFF TODO

See also `docs/PRE_KICKOFF_AMD_KICKOFF_CHECKLIST.md`.

1. Implement `VllmRequestUnderstandingAdapter` using `OpenAICompatibleClient` + cleanup + `parseStructuredRequest`.
2. Implement `VllmModelAdapter` using the same client + cleanup + `parseProposal`.
3. Author JARVIS understanding/decision prompts (untrusted message as data only).
4. Wire `main.ts`: fixture → existing adapters; vllm → new adapters (**refuse or fail closed if misconfigured; never fall back silently**).
5. Map `ProviderError` categories into case failure reasons without leaking secrets.
6. Add adapter tests against `fake-openai-server.ts`; keep fixture `api:bench:ci` green.
7. Controlled live AMD smoke; then real-model benchmark (separate from BASELINE-V1).
8. Evolus / demos / latency — only after adapters verified.

**Stop for review. Do not merge. No kickoff adapter work in this branch.**
