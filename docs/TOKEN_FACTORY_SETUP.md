# AMD Token Factory → JARVIS (setup and verification)

**Status:** the integration is ready, but **no Token Factory call has been made yet**. The key was not available in the build session, and the endpoint details below are **unverified**.

JARVIS treats Token Factory as an OpenAI-compatible provider. No Token Factory-specific code exists or is needed:
- `GET {base}/models` must list the model.
- `POST {base}/chat/completions` must accept a Bearer key.
- Startup fails closed if either check fails. The same applies to the schema probes.

## 1. Facts to confirm from the official Token Factory page or your account (do not guess)

| Item | Where JARVIS uses it | Known? |
|---|---|---|
| Base URL (OpenAI-compatible, ends in `/v1`) | `JARVIS_MODEL_BASE_URL` | **Unverified.** Third-party pages cite `https://developer.amd.com.cn/radeon/api/v1` for "AMD Radeon Cloud Token Factory"; confirm against the official page or your key's issuer |
| Auth | `Authorization: Bearer $JARVIS_MODEL_API_KEY` | Assumed OpenAI-style; confirmed by step 2 |
| Model id | `JARVIS_MODEL_NAME`; must appear in `/models` | **Pick from the live `/models` output.** Never type an id from memory |
| `response_format: json_schema` support | `JARVIS_MODEL_STRUCTURED_OUTPUT` | Unknown; the startup probes test it |
| Rate limits / quotas | `JARVIS_MODEL_MAX_RETRIES`, `JARVIS_DAILY_MODEL_CALL_BUDGET` | Unknown; read your account page |
| Hardware behind the endpoint | Evidence only | A hosted API's hardware is the provider's claim; record their statement, don't infer it |

## 2. Verify the endpoint (your machine; the key stays in your shell)

```bash
# PowerShell: $env:JARVIS_MODEL_API_KEY = Read-Host -AsSecureString ... ; bash: read -s JARVIS_MODEL_API_KEY; export JARVIS_MODEL_API_KEY
export JARVIS_MODEL_BASE_URL=<official base URL ending in /v1>
curl -s -o /dev/null -w '%{http_code}\n' "$JARVIS_MODEL_BASE_URL/models"                        # expect 401 without a key
curl -s -H "Authorization: Bearer $JARVIS_MODEL_API_KEY" "$JARVIS_MODEL_BASE_URL/models" | jq -r '.data[].id'
```

Choose an **instruction-tuned** model from that list. The JARVIS prompts need strict JSON, and a mid-size instruct model is a good first try.

## 3. Run JARVIS locally against it (node server; recommended first)

```bash
export JARVIS_AI_MODE=vllm
export JARVIS_MODEL_NAME=<id exactly as listed>
export JARVIS_MODEL_TIMEOUT_MS=20000
export JARVIS_MODEL_MAX_RETRIES=1          # transient 429/5xx/connection only
export JARVIS_DAILY_MODEL_CALL_BUDGET=300  # 2 x (1+retries) reserved per case
npm run api:start
```

**Expect:**
- `[jarvis] ai startup: {... "modelListed":true, "probes":{"understanding":"ok","decision":"ok"} ...}`;
- `GET /api/health` → `provider.startupProbes`, call counts, and the last call with latency and tokens.

**Failure stages:**
- `MODEL_LIST`: wrong URL or key.
- `MODEL_NOT_SERVED`: wrong model id.
- `PROBE_*`: the model or endpoint can't produce schema-valid output. Retry once with `JARVIS_MODEL_STRUCTURED_OUTPUT=off`, record that, and never loosen parsing.

Then run, in order:
1. The four demos in the UI (`npm run web:dev`).
2. `npm run api:bench:vllm -- --run tf-1`. The hard gate is 0 unsafe actions.
3. Record the results in `docs/AMD_EVIDENCE.md`.

## 4. Vercel (server-side only)

The `api/*` functions can serve a real model only with an explicit opt-in. Add these in **Project → Settings → Environment Variables**, scoped to **Preview** first:

| Name | Value | Notes |
|---|---|---|
| `JARVIS_AI_MODE` | `vllm` | |
| `JARVIS_SERVERLESS_REAL_MODEL` | `enabled` | Without this, cases are refused (503) rather than silently served by fixtures |
| `JARVIS_MODEL_BASE_URL` | official base URL | |
| `JARVIS_MODEL_NAME` | listed id | |
| `JARVIS_MODEL_API_KEY` | the key | Mark **Sensitive**. Never prefix with `VITE_`; only `api/*` reads it, and the web bundle has no access (tested) |
| `JARVIS_MODEL_TIMEOUT_MS` | `10000` | A cold start makes up to 5 calls; keep the total under `maxDuration` (60 s) |
| `JARVIS_MODEL_MAX_RETRIES` | `1` | |
| `JARVIS_DAILY_MODEL_CALL_BUDGET` | e.g. `200` | **Per function instance.** Serverless limits are not global |

**How it behaves:**
- Only requests that pass the guard (the four public demos, or a valid `JARVIS_CASES_TOKEN`) trigger the model.
- The startup checks run once per instance.
- A failed check returns 503 `model_unavailable` and is retried on the next request.

**Order of operations:**
1. Preview deploy.
2. Smoke tests: `/api/health`, which should show `"aiMode":"vllm"`, `"startup":"ok"` after the first demo, and the model id. Then the four demos twice each, and confirm free text is denied.
3. Only then promote to production.

Production promotion is the owner's call.

**Cost exposure:** the four public demos call the model for anyone who can reach the URL, bounded by per-instance rate, concurrency and budget limits. For judging, consider keeping deployment protection on and sharing a bypass link.
