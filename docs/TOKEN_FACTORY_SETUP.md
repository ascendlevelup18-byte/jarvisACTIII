# AMD Token Factory → JARVIS (setup and verification)

**Status:** the integration is ready, but **no Token Factory call has been made yet**. The key was not available in the build session, and the endpoint details below are **unverified**.

JARVIS treats Token Factory as an OpenAI-compatible provider. No Token Factory-specific code exists or is needed:
- `GET {base}/models` must list the model.
- `POST {base}/chat/completions` must accept a Bearer key.
- Startup fails closed if either check fails. The same applies to the schema probes.

## 1. Facts to confirm from the official Token Factory page or your account (do not guess)

| Item | Where JARVIS uses it | Known? |
|---|---|---|
| Base URL (OpenAI-compatible, ends in `/v1`) | `JARVIS_MODEL_BASE_URL` | **Unknown until copied from the owner's dashboard.** The event FAQ (lablab.ai page, read 14 Oct 2026) says the hackathon is hosted on **`https://notebooks.amd.com/tokenfactory`**, which requires an AMD AI Developer Program sign-in. Copy the base URL from that dashboard, or confirm it with a successful authenticated `/models` call. **15 Oct update:** the AMD Token Factory API documentation the team received gives `https://developer.amd.com.cn/radeon/api/v1`, and the owner's `rc-` key authenticated there on 14 Oct 2026 (chat HTTP 200; `docs/AMD_EVIDENCE.md`). That is the base URL in use. *Earlier note, superseded:* this file previously called it a Radeon Cloud (China) URL not to be used; its identity with the `notebooks.amd.com` portal is still not independently confirmed |
| Auth | `Authorization: Bearer $JARVIS_MODEL_API_KEY` | Assumed OpenAI-style; confirmed by step 2 |
| Model id | `JARVIS_MODEL_NAME`; must appear in `/models` | **Pick from the live `/models` output.** Sources disagree (e.g. `DeepSeek-V4-Flash` vs a dated variant) and the catalogue is described as changing; never type an id from memory |
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

## 2b. Windows PowerShell (recommended for the owner's machine)

`scripts/tokenfactory-smoke.ps1` does step 2 safely:
- it reads the key with `Read-Host -AsSecureString`, never prints it, writes nothing to disk and clears it at the end;
- it checks that `/models` refuses an unauthenticated request, lists the served ids, and optionally makes one 8-token chat call (status, latency, usage).

It works in Windows PowerShell 5.1 (it enables TLS 1.2) and PowerShell 7. It was written in a sandbox without PowerShell and is covered by static tests (`apps/api/test/scripts.test.ts`), so its first run on Windows is also its first execution.

```powershell
cd C:\jarvis-actiii-preview
git pull origin claude/kickoff-day1-jkg6ry
$Base = "<base URL copied from the official Token Factory page, ending in /v1>"
powershell -ExecutionPolicy Bypass -File .\scripts\tokenfactory-smoke.ps1 -BaseUrl $Base
powershell -ExecutionPolicy Bypass -File .\scripts\tokenfactory-smoke.ps1 -BaseUrl $Base -Model "<id exactly as listed>"
```

Then run JARVIS against it from the same PowerShell window. The key lives only in this process's environment:

```powershell
$k = Read-Host "API key" -AsSecureString
$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($k)
$env:JARVIS_MODEL_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b); Remove-Variable k, b
$env:JARVIS_AI_MODE = "vllm"
$env:JARVIS_MODEL_BASE_URL = $Base
$env:JARVIS_MODEL_NAME = "<id exactly as listed>"
$env:JARVIS_MODEL_TIMEOUT_MS = "20000"
$env:JARVIS_MODEL_MAX_RETRIES = "1"
$env:JARVIS_DAILY_MODEL_CALL_BUDGET = "300"
$env:PORT = "3000"
npm run api:start          # fails closed (exit 1) at MODEL_LIST / MODEL_NOT_SERVED / PROBE_* if anything is wrong
```

In a second window run `npm run web:dev` and open http://127.0.0.1:43123. The header should read `MODEL · <id>`. Run the four demos, then stop the server and run, in the first window:

```powershell
npm run api:bench:vllm -- --run tf-1    # hard gate: 0 unsafe actions; writes evals/results/...vllm-<model>-tf-1.json
Remove-Item Env:JARVIS_MODEL_API_KEY    # clear the key when done
```

Record the date, base URL, model id, `/api/health` provider block and the benchmark summary in `docs/AMD_EVIDENCE.md`. Record the provider's hardware statement only as their claim.

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
