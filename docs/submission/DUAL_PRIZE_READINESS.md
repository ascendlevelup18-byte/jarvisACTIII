# JARVIS ACT III — AMD + GOOGLE DUAL-PRIZE READINESS

15 Oct 2026. Labels: **VERIFIED** (inspected or executed today), **REPORTED** (earlier handover, not re-run today), **UNCONFIRMED** (no authoritative evidence).

## 1. Repository state and Work activity

- HEAD `4b0e9cc` = `origin/claude/kickoff-day1-jkg6ry` (VERIFIED). Nothing staged, committed, pushed or deployed today.
- ChatGPT Work: 22 modified files under `apps/web` (+270/−395) and 6 new files, including `components/assistant/AssistantPanel.tsx` and `lib/assistant-intent.ts` (VERIFIED). Still uncommitted; I treated all of it as read-only.
- Claude-owned: `docs/submission/**` (untracked) and corrections to `docs/SUBMISSION.md`, `SUBMISSION_PREFLIGHT.md`, `DEMO_SCRIPT.md`, `TOKEN_FACTORY_SETUP.md` (VERIFIED). User-owned: `.gitignore`.
- Production = 12 Oct build; preview of 14 Oct behind Vercel login; repo private (REPORTED 15 Oct earlier today).

## 2. AMD award eligibility

Source: https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii (read 15 Oct 2026).

| Point | Text on the page | Status |
|---|---|---|
| AMD is required for every prize | "AMD is a required technology to be eligible for prizes." | VERIFIED |
| AMD part must be in the product shown | the AMD component "must be part of the working product shown to the judges" | VERIFIED |
| Token Factory API is enough to take part | FAQ: "The event is hosted on notebooks.amd.com/tokenfactory…" and "Developers dont need the $100 credit to participate in the event. Just the api from the tokenfactory." | VERIFIED |
| Our base URL is that Token Factory | URL comes from the AMD Token Factory API documentation the team received; not cross-checked against the portal | UNCONFIRMED |
| JARVIS meets "part of the working product" | Live run 14 Oct: all AI calls `vllm:DeepSeek-V4-Flash` (17/17 checks) | REPORTED; the public preview is fixture-only, so the video must show the live model |

## 3. Google award eligibility

| Point | Text on the page | Status |
|---|---|---|
| What qualifies | "Use Gemma in your project for a chance to win the Google prize." | VERIFIED |
| Gemma on AMD is the intended path | "You can now build with Gemma, Google DeepMind's family of open models, running on AMD GPUs in the cloud…" | VERIFIED |
| Google is optional | "Google and Evolus technologies are optional." | VERIFIED |
| Can one project win AMD and Google | "A single project may qualify for the main challenge prize, one partner prize, or both partner prizes." | VERIFIED |
| Prize | "$5,000 in prizes from Google" | VERIFIED |
| Gemini API or AI Studio qualifies | Not mentioned; only Gemma is named | UNCONFIRMED: treat as **not** qualifying |
| Using Gemini to make the video qualifies | Not mentioned | UNCONFIRMED: do not rely on it |
| Gemma must run inside the submitted app | Not stated; "in your project" is the wording | Reasonable interpretation: yes, in the working product |
| Gemma available to us on AMD | `Gemma-4-31B-IT` is in our Token Factory `/models` list (14 Oct) | REPORTED; a chat call with our key is UNCONFIRMED |
| Separate Google fields, judging criteria, proof required | Not on the page | UNCONFIRMED |
| Deadline | "Event Schedule: To be announced"; online build 12–18 Oct | UNCONFIRMED; keep the internal cutoff Oct 18, 14:00 UTC |
| Age, location, legal terms | Teams of 1–6; must join the AMD AI Developer Program; rule book at lablab.ai/hackathon-rules and lablab.ai/terms-of-use#16-participation-terms (pages did not render for me) | Partly UNCONFIRMED |

## 4. Questions for the organizers (Discord or lablab support)

1. "Does Gemma served through the AMD Token Factory API (model `Gemma-4-31B-IT`) count for the Google prize, or must Gemma be self-hosted on AMD Developer Cloud?"
2. "Is there a separate field or proof required to enter the Google prize?"
3. "What is the exact online submission deadline and timezone?"

## 5. AMD integration audit

| Check | Evidence | Status |
|---|---|---|
| Real requests and parsing | `openai-compatible-client.ts`: rejects non-JSON, missing `choices[0].message.content`, any `finish_reason` other than `stop`; body size cap | VERIFIED (code) |
| Schema validation, fail-closed | Zod parsing of understanding and proposal; startup refuses to serve without a listed model and two passing probes (`ai-mode.ts` stages MODEL_LIST, MODEL_NOT_SERVED, PROBE_*) | VERIFIED (code + 256 tests) |
| Model proposes, policy decides | `policy-engine.ts`: intent must be DUPLICATE_CHARGE_REFUND and corroborated by deterministic cues; one autonomous refund per order | VERIFIED (code) |
| Amount from records | gateway refuses amounts above `amountMinor − refundedMinor`; policy derives amount from the charge | VERIFIED (code) |
| Idempotency | `gateway.ts` keyed on `idempotencyKey`; #48293 closes with no action | VERIFIED (code + fixture run) |
| Read-back verification | VERIFICATION event before RESOLVED; DC-E05 (gateway misreport) ends FAILED | VERIFIED (fixture bench) |
| Audit and provider attribution | UNDERSTANDING_CALL / MODEL_CALL events carry `adapter` (`vllm:<model>`) and latency | VERIFIED (fixture); REPORTED (live) |
| Rate, budget, concurrency | `ingress.ts`: token gate, per-client rate, concurrency, daily model-call budget; client pacing 3.1 s | VERIFIED (code) |
| No credentials in the browser | key read server-side only; bundle and Vercel env scans 0 hits | REPORTED (14 Oct) |
| Naming | Adapter ids say `vllm:` but the endpoint is AMD's hosted API, not our vLLM server | VERIFIED; docs already say so |

**26/30 vs 90.0%: both correct, different metrics.** `safeResolutionRate` = (correct autonomous 7 + correct escalations 20) / 30 = 27/30 = 90.0% (`apps/api/eval/metrics.ts`). "Passed" requires the exact expected final state: DC-A09 ended FAILED (invalid model output, no action), which counts as a correct escalation but not a pass. I reworded slide 8 and two docs to say this; the PDF is re-exported.

## 6. Recommended Google integration: Gemma for request understanding, on AMD

Run the **understanding** stage on `Gemma-4-31B-IT` and keep the **decision proposal** on `DeepSeek-V4-Flash`, both through the same AMD Token Factory API.

Why this one:
- **Meets the stated rule** ("use Gemma in your project") inside the working product, with Gemma itself running on AMD, which also strengthens the AMD story.
- **Real contribution on the critical path**: Gemma turns the customer's message into the structured request (intent + stated amounts) that every later step uses.
- **Safety is unchanged by design**: the understanding output is already untrusted. Deterministic intent cues and a money scan in `evidence.ts` back it up, and policy needs corroboration before any refund. A Gemma mistake can cause an escalation, not a payment.
- **Smallest change**: no engine or policy file changes (those are protected); only config, adapter wiring and reporting.
- **Easy to prove**: audit events will show `UNDERSTANDING_CALL adapter=vllm:Gemma-4-31B-IT` and `MODEL_CALL adapter=vllm:DeepSeek-V4-Flash`.

This matches the proposed "Google analysis → AMD proposal" order, but as two existing stages, not a new layer.

## 7. Alternatives considered

| Option | Contribution | Effort | Safety | Verdict |
|---|---|---|---|---|
| **A. Gemma = understanding (recommended)** | intent + amounts for every case | ~3 h incl. tests | unchanged (output untrusted, backstopped) | Best value per risk |
| B. Gemma = structured ticket extraction | same as A in this codebase (understanding already does extraction) | — | — | Same as A |
| C. Gemma = second independent reviewer that must agree | could cut false approvals | needs a case-engine change (protected) and a 3rd call per case (20 rpm cap → slower) | stricter | Not before the deadline |
| D. Gemma = merchant explanations / multilingual replies | visible but off the decision path | ~3–4 h plus UI work in Work's files | neutral | Weak prize story; touches the frontend |
| E. Gemini API / AI Studio | not named in the rules | similar | similar | Not eligible as far as the page says |
| F. All-Gemma (both stages) | maximal Google share | config only once A exists | same | Run as a benchmark variant; ship whichever is safer |

## 8. Files and interfaces to change (after approval)

| File | Change |
|---|---|
| `apps/api/src/ai-config.ts` | Optional `JARVIS_UNDERSTANDING_MODEL_NAME` (defaults to `JARVIS_MODEL_NAME`); optional `JARVIS_UNDERSTANDING_STRUCTURED_OUTPUT`; include both in `aiConfigSummary` |
| `apps/api/src/provider/openai-compatible-client.ts` | Let two clients share one pacing gate so the account stays under 20 requests/min |
| `apps/api/src/ai-mode.ts` | Build an understanding client and a decision client; startup checks both models are listed and runs each probe on its own model; report both in the startup report |
| `apps/api/src/server.ts`, `serverless.ts` (health) | Report the model per stage, e.g. `models: { understanding, decision }` (no secrets) |
| `apps/api/eval/vllm-benchmark.ts` | Record both model ids in `run`; results file name with both slugs |
| `scripts/verify-demo.mjs` | `--real-model` proof also prints which model handled each stage; optional `--expect-understanding-model` |
| `scripts/live-gate.ps1`, `docs/submission/recording/start-live-api.ps1` | Optional `-UnderstandingModel` |
| Tests | config parsing, two-client wiring, startup failure when the Gemma model is not served, shared pacing, audit attribution per stage |

Unchanged: `case-engine.ts`, `policy-engine.ts`, `evidence.ts`, `gateway.ts`, `state-machine.ts`, `contracts.ts`, `data/**`, `evals/baselines/**`, all of `apps/web`.

## 9. Effort and deadline risk

- Code and tests: about 3 hours. Live verification: 1 Gemma smoke call, then one live gate run (~70 calls, ~8 minutes at the 20 rpm cap).
- Risks: (1) Gemma chat may be refused for our key or be slower: one smoke call answers this. (2) Daily cap $1: two full benchmarks in one day may hit it; check `/usage` first. (3) The AMD key is still not rotated; rotating it does not block this work.
- Fallback: the AMD-only configuration stays the default; Gemma is opt-in by one env var, so nothing regresses if Gemma underperforms.

## 10. Dual-provider benchmark plan

Same pinned dataset (`data/cases/duplicate-charge-eval.v1.json`, SHA-256 `d5a8b406…c28e47`), same endpoint, same settings (timeout 30 s, 1 retry, 3.1 s pacing), same day.

| Run | Understanding | Decision | Status |
|---|---|---|---|
| A0 (history) | DeepSeek-V4-Flash | DeepSeek-V4-Flash | tf-1, 14 Oct: 26/30, 0 unsafe. Keep untouched |
| A1 | DeepSeek-V4-Flash | DeepSeek-V4-Flash | re-run same day as B for fair latency (optional if budget is tight) |
| B | Gemma-4-31B-IT | DeepSeek-V4-Flash | candidate |
| C (optional) | Gemma-4-31B-IT | Gemma-4-31B-IT | all-Gemma variant |

Metrics (all already in the results JSON unless noted): exact passes, correct escalations, unsafe actions (gate: 0), false approvals (`incorrectAutonomous`), conservative escalations, parse failures per stage, provider errors, timeouts, latency p50/p95 per stage, model calls, cost (read `/usage?include_recent=true` before and after each run; new), audit completeness (every case has both AI-call events). Decision rule: ship B only if unsafe = 0 and it is not worse than A1 on correct escalations; otherwise keep AMD-only and say so.

## 11. Safety and security

- Neither model can call the gateway or set an amount; nothing in the plan touches policy, evidence, gateway or engine code.
- Startup stays fail-closed for both models; there is no fallback from Gemma to DeepSeek at runtime (a silent swap would make provider attribution false).
- Keys stay server-side; the same key serves both models; no new secret. Health reports model names only.
- Credential rotation is still open; the key was exposed in local PowerShell history on 14 Oct and that entry was removed on 15 Oct.

## 12. Submission package readiness

Ready: description, slides PDF (numbers re-checked today; slide 8 clarified), architecture, evidence, recording script, video-production plan, release procedures. Not ready: MP4, current screenshots (after Work finishes), public URL, public repo, track choice. If Gemma ships: update slides 5, 8, 9, the description, tags (add "Google Gemma"), and add a Gemma line to the video scene 9.

## 13. Release blockers

Work not finished · preview behind login · production outdated · repo private · key not rotated · MP4 missing · deadline unconfirmed.

## 14. Connected assistant (for Work's panel)

A genuinely backend-connected assistant is **not** recommended before the deadline. Today's panel (keyword routing in the browser, saved demo requests through `POST /cases`) is honest and safe. A connected version would need a new server endpoint with an allowlist of read-only intents (list orders, show pending reviews, explain a recorded case), its own auth (the operator token must never reach the browser), rate limits and audit events. That is a day of work plus UI changes in Work's files. Keep the panel as is and keep the narration honest.

## 15. Decision

**A. IMPLEMENT GOOGLE INTEGRATION NOW**, scoped to Gemma for request understanding on AMD, opt-in by config, after one approved Gemma smoke call. Eligibility for "use Gemma" is stated on the event page; the one open question (does Token Factory-served Gemma count) is worth asking organizers in parallel but does not block building, because the page itself describes Gemma "running on AMD GPUs in the cloud".

### Steps after your approval

1. You run one Gemma smoke call (hidden key prompt, about one cent):
   ```powershell
   cd C:\jarvis-actiii-preview
   Set-ExecutionPolicy -Scope Process Bypass -Force
   & .\scripts\tokenfactory-smoke.ps1 -BaseUrl https://developer.amd.com.cn/radeon/api/v1 -Model Gemma-4-31B-IT
   ```
2. I implement §8 in fixture mode with tests (no frontend files), run all suites, and commit locally.
3. You run the live gate twice (A1 and B) with the hidden prompt; I compare the results and update evidence, slides and the video plan.
4. Push and deploy stay behind separate approvals.
