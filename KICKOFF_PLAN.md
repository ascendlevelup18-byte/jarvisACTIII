# KICKOFF PLAN — JARVIS ACT III (DO NOT EXECUTE IN PACKAGING)

**Status:** PLAN ONLY. This packaging pass does **not** implement or run kickoff work.  
**Prerequisite product:** `6afb019` (fixture backend + UX V3 + Netlify + AMD scaffold).  
**Hard rule:** keep fixture `api:bench:ci` green (0 unsafe) throughout; never silent-fallback to fixture when `JARVIS_AI_MODE=vllm`.

---

## Phase K — Provider client hardening (before adapters)

Work on `apps/api/src/provider/openai-compatible-client.ts` (+ tests against `apps/api/test/fake-openai-server.ts`).

### K1 — `finish_reason` handling

- Inspect OpenAI-compatible chat completion `choices[0].finish_reason`.
- Define explicit behavior for `stop`, `length`, `content_filter`, and unknown values.
- Adapters must not treat truncated / filtered content as a valid structured proposal.
- Add fake-server cases covering non-`stop` finish reasons.
- **Do not** change case-engine policy or dataset.

### K2 — Request timeout

- Confirm `JARVIS_MODEL_TIMEOUT_MS` aborts the HTTP request via `AbortSignal`.
- Map abort → typed `TIMEOUT` (`ProviderError`), redacted message.
- Fake-server hang test must remain deterministic.
- Document that adapter layers must fail closed (case `FAILED` / escalate path), never invent a proposal.

### K3 — Body-read timeout / oversized body

- Ensure response body read is bounded (`maxResponseBytes` / streaming abort).
- Oversized → `RESPONSE_TOO_LARGE`; slow drip that exceeds deadline → `TIMEOUT` (not hang forever).
- Fake-server coverage for large body and slow body.
- No change to refund authorization logic.

### K4 — `listModels` (or equivalent)

- Add a minimal `GET {baseUrl}/models` (or documented equivalent) helper for bring-up / health.
- Use for AMD smoke only; do **not** gate production refunds on model list.
- Failure categories: `CONNECTION_ERROR`, `HTTP_4XX`/`HTTP_5XX`, `TIMEOUT`, `INVALID_JSON`.
- Keep secrets out of logs (`redactSecrets` / never print API keys).

**Exit criteria for Phase K:** provider unit tests green; fixture suite still ~86 pass; `api:bench:ci` unchanged metrics.

---

## Phase A — Adapters (required for `JARVIS_AI_MODE=vllm`)

1. Implement `VllmRequestUnderstandingAdapter` using `OpenAICompatibleClient` + `cleanupModelContent` + existing `parseStructuredRequest`.
2. Implement `VllmModelAdapter` using the same client + cleanup + existing `parseProposal`.
3. Author JARVIS understanding + decision prompts; customer message is **untrusted data only** (never executable instructions).
4. Wire `apps/api/src/main.ts`: fixture → existing adapters; vllm → new adapters. Misconfig → refuse / fail closed. **Never** silently fall back to fixture.
5. Map `ProviderError` categories into case failure / audit reasons without leaking secrets.
6. Adapter tests against `fake-openai-server.ts`; keep fixture `api:bench:ci` green.

Checklist mirror: `docs/PRE_KICKOFF_AMD_KICKOFF_CHECKLIST.md`.

---

## Phase B — AMD / ROCm / vLLM bring-up

1. Provision AMD Developer Cloud (or MI300X) with ROCm + vLLM OpenAI-compatible `/v1`.
2. Set server-side env only (`JARVIS_AI_MODE=vllm`, `JARVIS_MODEL_BASE_URL`, `JARVIS_MODEL_NAME`, optional key, timeout). Never `VITE_*` for secrets.
3. Smoke: K4 `listModels` → generic client chat → understanding adapter → decision adapter.
4. See `docs/AMD_DEPLOYMENT_RUNBOOK.md` (skeleton).

---

## Phase C — Real-model benchmark (safety gate)

1. Run a **separate** real-model bench (do not overwrite BASELINE-V1 fixture pin / dataset SHA).
2. Gate: **0 unsafe autonomous actions** required before any public “AMD ready” claim.
3. Record Safe Resolution Rate / Correct Escalation Rate deltas vs fixture baseline honestly.
4. If unsafe > 0: stop; fix prompts/adapters/policy mapping; do not proceed to Evolus.

---

## Phase D — Evolus (last)

- Only after Phase C passes the **0 unsafe** real-model gate.
- Do not invent Evolus stubs that imply production readiness.
- Keep Netlify public demo truthful if still fixture-backed.

---

## Explicit non-goals for early kickoff

- Redesigning UX V3 Operations UI
- Weakening or deleting outcome-guard / policy tests
- Claiming VERIFIED AMD / Evolus without command evidence
- Duplicating business logic inside Netlify functions
- Presenting fixture 96.7% / 100% as AMD-model scores

---

## Suggested verification commands (when executing kickoff later)

```bash
npm ci && npm ci --prefix apps/web
npm run api:typecheck && npm run api:test && npm run api:bench:ci
npm run web:build && npm run web:test
# plus new provider/adapter tests and a separately labeled real-model bench
```
