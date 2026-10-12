# JARVIS ACT III: engineering handover

**As of:** 2026-10-12, end of Sprint 3 (Vercel validation, AMD runbook, submission prep).
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
| sprint | `c9d6256` | full-system-prompt decision versioning; adapters take a `ChatClient` | yes (pushed in Sprint 2) |
| G3 | `04b4100` | vLLM startup wiring with fail-closed checks | yes |
| sprint | `56908a4` | opt-in real-model benchmark (`api:bench:vllm`) | yes |
| sprint | `b0ca687` | handover + status docs | yes |
| Sprint 2 | `7f8d168` | ingress guard: demo allowlist, bearer token, cost limits, fresh demo worlds | yes |
| Sprint 2 | `dbf117d` | shared serverless handler; Netlify + Vercel wrappers; e2e tests | yes |
| Sprint 2 | `b13e39a` | README, `AMD_EVIDENCE.md`, `SUBMISSION.md`, status, `.env.example` | yes (pushed in Sprint 3) |
| Sprint 3 | the commit adding Sprint 3 docs/config | `vercel.json` master auto-deploy off, deploy-config test, AMD runbook, submission checklist | **local only** |

The remote branch (PR #1) is at `b13e39a`.

**PR #1:**
- Base `master` (`5b5a5fe`), head `claude/kickoff-day1-jkg6ry`.
- 14 commits, all ACT III; 38 files.
- No `data/`, `evals/` or engine-core files.
- No CI checks configured (the repo has no workflows).
- Its description covers only G1/G2 and says "fallback"/"extraction" where the code does neither. Suggested replacement text is in `docs/SUBMISSION.md`. The PR has not been edited.

The Sprint 3 commit needs a separate push authorization.

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

## Ingress security and demos (Sprint 2)

One guard (`apps/api/src/ingress.ts`) serves every entry point. It runs **before any model call**.

**Public demo:**
- The request must exactly equal one of the four canonical scenarios, after the schema's whitespace trim.
- It runs without a token in a fresh synthetic store with a simulated gateway.
- The response carries `x-jarvis-demo-run` (`DEMO-<uuid>`), `x-jarvis-demo-scenario` and `x-jarvis-payments: simulated`.

**Privileged (everything else):**
- Needs `Authorization: Bearer $JARVIS_CASES_TOKEN`: server-side, ≥ 24 chars, compared in constant time over sha256 digests.
- Missing or wrong token → 401. No token configured → 403 `free_text_disabled`.
- On the node server, privileged cases share one persistent world, so idempotency holds across requests. On serverless, each gets a fresh world.

**Limits** (`apps/api/src/limits.ts`), returning 429 + `Retry-After`:
- per-client rate, 30/min by default;
- global concurrency, 2 by default;
- a daily model-call budget. vllm reserves 2 per case, and an explicit `JARVIS_DAILY_MODEL_CALL_BUDGET` is required in vllm mode, else startup exits 1.
- The budget is not refunded on early failure (conservative).
- No retries anywhere.

**Logs:**
- One `[jarvis] case:` line per request: status, class, demo id, run id, case id, state, latency.
- They never include message text or the token.

**Limitation:** the limits are in-process. They are a real global limit only for a single long-running server; on serverless they are per instance. Serverless is therefore fixture-only, and **public real-model exposure stays blocked** until an external, global limiter exists.

**Serverless:**
- `apps/api/src/serverless.ts` provides the Web-standard handlers.
- `netlify/functions/*` and `api/*` (Vercel) are thin wrappers.
- A deployment with `JARVIS_AI_MODE=vllm` refuses cases (503) rather than serving fixtures.
- Health reports `aiMode: fixture`, `remoteModel: false` and per-instance limits.

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

## Regression results (end of Sprint 3)

| Check | Result |
|---|---|
| `api:typecheck` | 0 errors (now also covers `api/` and `netlify/functions/`) |
| `api:test` | **194/194** (G3 end: 164; Sprint 2 +28; Sprint 3 +2 deploy-config) |
| `web:test` | 11/11 |
| `web:build` | OK; the bundle contains no token or model-endpoint config (scan matches are the case `authorization` field only) |
| `legacy:check` | 58/58 |
| `api:bench:ci` (fixture) | 29/30; **0 unsafe**, no money moved. The one miss is DC-S04, a conservative escalation (known) |
| Dataset SHA-256 | `d5a8b4064b81bf8bfd69f95e8e0b6aa081529d63b053287a2761d3f4c9c28e47` (unchanged) |
| Engine-core diff vs `b0ca687` | 0 lines (see the list below) |
| Mutation checks | Disabling the token compare → 4 failures; disabling the limiter → 5 failures; restored |
| Serverless bundle | `api/*` and `netlify/functions/*` bundle with Rolldown, and the bundled Vercel `/cases` serves a demo (local smoke; not Vercel's builder) |

Files covered by the engine-core diff:
- `contracts`, `case-engine`, `policy-engine`, `evidence`, `intent-cues`, `money`, `state-machine`, `gateway`, `fixtures`
- `data/**`, `evals/**`, `apps/web/**`

`server.ts` and `netlify/functions/cases.ts` changed under your Sprint 2 approval (ingress only).

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
| 5 | Private, authenticated inference endpoint (`--api-key`, not publicly exposed) | PENDING. Evidence template: `docs/AMD_EVIDENCE.md` |
| 6 | `/v1/models` lists the model; `npm run api:start` with `JARVIS_AI_MODE=vllm` passes the startup gate | PENDING; code ready |
| 7 | Structured-output probe in `json_schema` mode (switch to `off` only if the server rejects `response_format`, and record that) | PENDING; code ready |
| 8 | Four demo cases through the API and UI in vllm mode | PENDING |
| 9 | `npm run api:bench:vllm -- --run 1` (and further runs): 0 unsafe in every run | PENDING; code ready |
| 10 | Evidence manifest (`docs/AMD_EVIDENCE.md`; secrets redacted) | Template ready; all fields UNVERIFIED |

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

In Sprint 2 I searched the repo again: there are still no official Evolus docs, endpoints or workspace credentials. No interface was built, because one built now would be speculative.

**Blocker:** official event-workspace access and docs. Once those exist, the grounded integration points are already isolated:
- **policy text for prompts:** `RefundPolicy.sections`; retrieved knowledge may inform proposals but never thresholds;
- **escalation hand-off:** after a terminal `ESCALATED` state, outside the engine, so outbound failures cannot change case results.

## Vercel

**The real Vercel build is verified locally. The preview deployment is BLOCKED.**

**Verified:**
- `vercel build` (Vercel CLI 63.1.2, Vercel's own builders) on a clean `git archive` of `b13e39a` completes:
  - Vite assets go to `.vercel/output/static`;
  - `api/cases` and `api/health` become `nodejs24.x` functions;
  - `.ts` import specifiers are rewritten to `.js`.
- Route table: filesystem first, then `/cases` → `/api/cases`, then the SPA fallback excluding `/api/`.
- Running the **compiled** functions directly:
  - four demos × two orders: RESOLVED / ESCALATED / CLOSED_NO_ACTION / ESCALATED, every time, all `x-jarvis-payments: simulated`, each with a distinct demo-run id;
  - free text → 403; modified demo → 403; an extra `aiMode` field → 400; `GET /api/cases` → 405;
  - health reports `aiMode: fixture`, `remoteModel: false`.
- This ran under Node 22 locally; Vercel would run Node 24.

**Blocked:**
- Creating the Vercel project through the connector returned **403 forbidden** ("You don't have permission to create the project").
- The account is team `ascend-revoution`, Hobby plan, with no projects. There is no Vercel CLI login in this session.
- I did not try other routes around the permission error.

**To unblock (owner, about 2 minutes):**
1. In the Vercel dashboard, choose Add New → Project and import `ascendlevelup18-byte/jarvisACTIII`.
2. Root directory: repo root. Framework: Other. `vercel.json` supplies the build, install and output settings.
3. Add **no** environment variables. Leaving `JARVIS_CASES_TOKEN` unset keeps free text disabled.
4. Deploy a preview from branch `claude/kickoff-day1-jkg6ry`, or tell me and I'll create it once the project exists.

**Safety settings:**
- `vercel.json` sets `git.deploymentEnabled.master: false`, so merging PR #1 won't auto-deploy production. That takes effect once this commit is pushed.
- Preview protection follows the team default (Vercel Authentication). For judges, either turn protection off for previews or share a bypass link.

## Outstanding approvals

1. Push the Sprint 3 commit (the `vercel.json` master auto-deploy guard plus docs).
2. The Vercel project, created by the owner (connector permission is 403). Then one preview deploy from the branch.
3. AMD credits or an approved endpoint, before any real-model run (`docs/AMD_DEPLOYMENT_RUNBOOK.md`).
4. Production deployment, public vllm exposure, and the PR #1 merge or description edit: all owner decisions.

## Next executable task

Owner: import the repo into Vercel (steps above). Then one preview deploy of `claude/kickoff-day1-jkg6ry`, and run the acceptance checks against its URL:
- `/api/health`;
- the four demos twice each, in two orders;
- free text → 403/401;
- a modified demo → denied.

When AMD access arrives, follow `docs/AMD_DEPLOYMENT_RUNBOOK.md` §1–§9 and fill `docs/AMD_EVIDENCE.md`.
