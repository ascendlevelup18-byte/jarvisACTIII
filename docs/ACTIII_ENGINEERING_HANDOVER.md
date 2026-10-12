# JARVIS ACT III: engineering handover

**As of:** 2026-10-12, end of the G3 sprint.
**Branch:** `claude/kickoff-day1-jkg6ry`. `master` is untouched (`5b5a5fe`, the pre-hackathon baseline).

Labels used below:
- **VERIFIED** means it ran here and the output was checked.
- **FAKE-SERVER VERIFIED** means it was exercised against the local fake OpenAI-compatible server with a scripted model. That proves plumbing and fail-closed behaviour, **not** real-model quality or AMD performance.
- **NOT DONE** means exactly that.

## Commits

| Gate | Commit | Summary | On GitHub? |
|---|---|---|---|
| G1 | `1083a7e` | K3: body-read timeout/abort → `ProviderError` | yes |
| G1 | `62cab40` | K1: reject non-`stop` `finish_reason`; return `finishReason` / `usage` | yes |
| G1 | `fc20aef` | K4: `listModels()` | yes |
| G1 | `d7a9ca7` | K2: single source of truth for model-call timeouts | yes |
| G2 | `eca9175` | fake server records the last request body | yes |
| G2 | `aa9fd39` | `VllmRequestUnderstandingAdapter`, `VllmModelAdapter`, §G rows 1–23 | yes |
| G2 | `8f198a1` | status doc | yes (pushed this sprint, fast-forward) |
| sprint | `c9d6256` | full-system-prompt decision versioning; adapters take a `ChatClient` | **local only** |
| G3 | `04b4100` | vLLM startup wiring with fail-closed checks | **local only** |
| sprint | `56908a4` | opt-in real-model benchmark (`api:bench:vllm`) | **local only** |
| sprint | the commit adding this file | handover + status docs | **local only** |

The sprint commits need a separate push authorization.

## Startup behaviour (G3)

`apps/api/src/ai-mode.ts` provides `buildAiAdapters` and `initializeAi`; `apps/api/src/main.ts` calls them.

**fixture mode:**
- Uses the fixture adapters with the 10 s engine timeout.
- Needs no endpoint and makes no network calls.
- Behaves as before.

**vllm mode:**
- One `OpenAICompatibleClient` serves both vLLM adapters.
- The engine timeout is `JARVIS_MODEL_TIMEOUT_MS`; the client timeout is that plus 2 s (K2).
- Before the server listens, startup runs these checks in order:
  1. `GET /models` must succeed (`MODEL_LIST`).
  2. The list must include `JARVIS_MODEL_NAME` (`MODEL_NOT_SERVED`).
  3. A synthetic understanding probe must return output that `parseStructuredRequest` accepts (`PROBE_UNDERSTANDING`).
  4. A synthetic decision probe must return output that `parseProposal` accepts (`PROBE_DECISION`).
- The probes contain no customer data.
- Any failure means an `AiStartupError`, then `[jarvis] startup failed, not serving: <STAGE>: …`, then exit 1.
- Fixture adapters are never built in vllm mode.

**Structured output:**
- `JARVIS_MODEL_STRUCTURED_OUTPUT` is `json_schema` (the default; sends `response_format`) or `off`.
- It is always explicit and never auto-downgraded. The probes run in the configured mode.

**Logging:**
- The config summary shows a sanitized endpoint (no userinfo, query or fragment) and `modelApiKeyConfigured: true/false`.
- The startup report includes `probes` and `startupMs`.
- There is one `model call` line per provider call: `{stage, model, responseId, finishReason, latencyMs, failureCategory}`.
- Logs never contain prompts, customer text or the key. The key is also scrubbed from startup error text.

**Prompt versions:**
- `UNDERSTANDING_PROMPT_VERSION` is sha256 of the full understanding system prompt.
- `decisionPromptVersion(policySections)` is sha256 of the full effective decision system prompt (instructions, policy lines and boundary block). A test proves it equals the hash of the system message actually sent, and that it is identical across cases.

## Benchmark readiness

The commands:
- `npm run api:bench:ci` is the fixture CI gate, unchanged. Its results file stays byte-identical.
- `npm run api:bench:vllm -- [--run <id>] [--out-dir <dir>]` is the opt-in real-model mode. It reads the `JARVIS_*` env and runs the same startup gate as the API.

The real-model mode:
- Enforces the dataset pin.
- Writes `evals/results/duplicate-charge-eval.v1.vllm-<model>-<run>.json` and never overwrites an existing file.
- Records:
  - git SHA and dirty flag
  - model id
  - sanitized endpoint
  - structured-output mode
  - timeouts
  - prompt versions
  - dataset hash
- Collects telemetry:
  - parse failures per stage
  - provider errors
  - timeouts
  - p50/p95 latency per stage
- Fails the run on any unsafe autonomous action.
- Rejects `--ci` (fixture-only).
- Leaves dataset-scripted model outputs (DC-E02, DC-E03) scripted, and excludes them from the model telemetry.

**Status:** FAKE-SERVER VERIFIED only. **No real-model benchmark has been run.**

## Regression results (end of sprint)

| Check | Result |
|---|---|
| `api:typecheck` | 0 errors |
| `api:test` | **164/164** (sprint start: 142; −2 retired pre-kickoff refusal tests, +24 new) |
| `web:test` | 11/11 |
| `web:build` | OK |
| `legacy:check` | 58/58 |
| `api:bench:ci` (fixture) | 29/30; **0 unsafe**, no money moved; Safe Resolution 96.7%, Correct Escalation 100% |
| Benchmark miss | DC-S04 (the known conservative escalation) |
| Dataset SHA-256 | `d5a8b4064b81bf8bfd69f95e8e0b6aa081529d63b053287a2761d3f4c9c28e47` (unchanged) |
| Frozen-file diff vs `8f198a1` | 0 lines (see the list below) |

Frozen files covered by the diff:
- `contracts`, `case-engine`, `policy-engine`, `evidence`, `intent-cues`, `money`, `state-machine`, `gateway`, `fixtures`, `server`
- `provider/errors`, `provider/response-cleanup`
- `data/**`, `evals/**`, `apps/web/**`

## §G matrix status

| Rows | What | Status |
|---|---|---|
| 1–23 | Adapter behaviour: valid/malformed/fenced/reasoning output; extra, missing and wrong-enum fields; invented amounts, transactions and refs; injection plus prompt boundary; mislabelled intent; timeout; connection; 4xx/5xx; oversized; refusal; truncation; four demos | FAKE-SERVER VERIFIED (`vllm-adapters.test.ts`) |
| 24 | Startup: model missing from `/models` or unreachable → exit 1, never fixture | FAKE-SERVER VERIFIED (`ai-startup.test.ts`, including `main.ts` as a process) |
| 25 | Fixture regression | VERIFIED (above) |
| — | Real-model behaviour of every row | NOT DONE: needs an endpoint |

## AMD: first real-model run checklist

| # | Step | Status |
|---|---|---|
| 1 | Confirmed credit allocation or approved alternative | PENDING (credits pending) |
| 2 | Verified GPU model and VRAM | PENDING |
| 3 | Compatible ROCm and vLLM runtime | PENDING |
| 4 | Model chosen, downloaded and served | PENDING |
| 5 | Private, authenticated inference endpoint (`--api-key`, not publicly exposed) | PENDING |
| 6 | `/v1/models` lists the model; `npm run api:start` with `JARVIS_AI_MODE=vllm` passes the startup gate | PENDING; code ready |
| 7 | Structured-output probe in `json_schema` mode (switch to `off` only if the server rejects `response_format`, and record that) | PENDING; code ready |
| 8 | Four demo cases through the API and UI in vllm mode | PENDING |
| 9 | `npm run api:bench:vllm -- --run 1` (and further runs): 0 unsafe in every run | PENDING; code ready |
| 10 | Evidence manifest (`docs/AMD_EVIDENCE.md`, §J of the kickoff package; secrets redacted) | NOT DONE |

**RX 6800 (16 GB, RDNA2) fallback:**
- It is not verified as supported by the target ROCm/vLLM stack. Confirm compatibility before attempting it.
- Any results from it must be labelled as local consumer-GPU runs, not AMD Developer Cloud evidence.

## Evolus: status only

There is no Evolus code and no Evolus API access in this repo. The only requirements written down are the §K entry gate of `docs/KICKOFF_IMPLEMENTATION_PACKAGE.md`.

§K gate items:

| Item | Status |
|---|---|
| (1) Adapters merged with §G green | Done locally; not merged |
| (2) AMD endpoint verified with evidence | No |
| (3) Four demos in vllm mode through the UI | No |
| (4) Real-model benchmark with 0 unsafe | No |
| (5) Byte-identical engine-core proof | Yes, as of this sprint |
| (6) Evolus event-workspace docs read | **Missing:** no docs, workspace or credentials in the repo |

The candidate building blocks (Document Extractor, Knowledge Library, Workflow) are hypotheses from that document, not verified APIs.

**Evolus is not working and has not been started.**

## Vercel: read-only compatibility assessment

What exists today:
- A Vite React SPA (`apps/web` → `apps/web/dist`).
- A long-running `node:http` API (`apps/api/src/main.ts`).
- Two Netlify functions (`netlify/functions/cases.ts`, `health.ts`). They use Web-standard `Request` → `Response` handlers, build a fresh synthetic store per request, and are hard-wired to fixture adapters.

| Concern | Finding |
|---|---|
| Static web | Directly compatible: static output from `apps/web/dist` with an SPA rewrite |
| API | `node:http` is not a serverless entry point. The Netlify handlers are Web-standard, so a thin `api/cases.ts` / `api/health.ts` re-export plus rewrites (`/cases` → `/api/cases`, `/api/health`) is the smallest port. **Unverified:** how Vercel's TypeScript build handles the repo's `.ts` import specifiers (`allowImportingTsExtensions`); test with a local build first |
| State | Per-request isolated synthetic store. Stateless, so safe on serverless and between visitors |
| Auth | None. `/cases` is public |
| Rate limiting / concurrency | None in the code |
| Model-call budget | None. In vllm mode each case costs 2 model calls, and each cold start would add `/models` + 2 probes |
| Function duration | vllm worst case is about 2 × (timeout + 2 s) per case at the default 30 s. Needs a `maxDuration` the plan allows (verify plan limits) |
| Demo isolation | Fixture mode: isolated. vllm mode: the private endpoint key must stay in server-side env only |

**Smallest safe approach:**
1. Deploy Vercel in **fixture mode only**, at parity with the current Netlify demo.
2. Keep real-model inference on a private, long-running host running `api:start` in vllm mode.
3. Expose real-model mode publicly only after adding:
   - a demo token or auth;
   - per-IP rate limiting;
   - a concurrency cap;
   - a daily model-call budget;
   - probe caching per instance.

Nothing has been deployed.

## Outstanding approvals

1. Push the local sprint commits (`c9d6256`, `04b4100`, `56908a4`, the docs commit) to `claude/kickoff-day1-jkg6ry`.
2. AMD credits or an approved endpoint, before any real-model run.
3. Any deployment (Vercel or Netlify) and any public exposure of vllm mode.

## Next executable task

When an endpoint exists, run this and record the output in `docs/AMD_EVIDENCE.md`:

```
JARVIS_AI_MODE=vllm JARVIS_MODEL_BASE_URL=<private /v1 url> JARVIS_MODEL_NAME=<served id> \
JARVIS_MODEL_API_KEY=<key> npm run api:start
```

This is the real startup gate: `/models`, then both probes. Then run the four demo cases, then `npm run api:bench:vllm -- --run 1`.

Until an endpoint exists, the next code task is to add a demo-token check and a per-instance model-call budget to the case handler, ahead of any public vllm deployment.
