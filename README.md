# JARVIS: autonomous duplicate-charge resolver

JARVIS resolves one ecommerce operations exception end to end: a customer reports a **duplicate charge**. The system handles it in eight steps:

1. Reads the message.
2. Gathers order, transaction and refund evidence.
3. Asks an AI model for a **structured proposal**.
4. Passes the proposal through **deterministic policy and permission checks**.
5. Executes an allowed (simulated) refund.
6. **Verifies** the result by reading it back.
7. Records a full audit trail.
8. **Escalates instead of acting** whenever evidence is incomplete, contradictory, adversarial or out of policy.

**The model proposes; deterministic code decides.** The model never chooses amounts, never executes anything and never marks anything verified. Money arithmetic, policy, permissions, idempotency, execution, verification and state transitions are plain TypeScript.

**Live demo:** https://jarvis-actiii-preview.vercel.app/#/command-center (no login; fixture AI, synthetic store, simulated payments).

**Post-submission work:** see [`docs/POST_SUBMISSION_AUDIT.md`](docs/POST_SUBMISSION_AUDIT.md). The submitted default branch and deployed demo are preserved; improvements are isolated on `post-submission/audit-hardening-2026-10-16`.

**Why it is not a chatbot:** the AI only interprets the request and proposes a structured action. Deterministic code authorizes, a simulated gateway executes, a read-back verifies, every step is audited, and anything unsafe is escalated to a person.

> **Truth labels:**
> - Payments are **simulated** and data is **synthetic**. No real money ever moves.
> - The **public demo runs fixture AI** (deterministic adapters), so visitors trigger no paid inference and no key is deployed.
> - **AMD hosted inference was verified locally on 14 Oct 2026:** JARVIS ran on DeepSeek-V4-Flash through AMD's hosted inference API (base URL from AMD's Token Factory API documentation): 17/17 real-model demo checks and the pinned 30-case benchmark with **0 unsafe autonomous actions** (26/30 exact outcomes, 20/20 escalations). Evidence: `docs/AMD_EVIDENCE.md`, `evals/results/`. No self-hosted AMD GPU is used.
> - An optional Google **Gemma** understanding path is implemented and offline-tested but **not proven end to end**: the endpoint stopped listing Gemma before a full live run.

## JARVIS Automations (merchant platform)

The app opens on a first-run setup ("What do you want to automate?"). It then offers a **demo store** and a light, sidebar-based **merchant command center**:

| Page | What it shows | Data source |
|---|---|---|
| Dashboard | Today's recorded cases, pending reviews, verified refunds, needs-attention list, automation status | Recorded cases, demo store |
| Proof Mode | Safety showdown, the four canonical scenarios, labelled fixture-benchmark KPIs | `/cases` responses, pinned benchmark |
| Orders | Sortable, searchable, filterable table (cards on mobile); detail drawer with payment records, linked cases, decision history and audit links; deep link `#/orders/<id>` | `GET /api/demo-store` + recorded cases |
| Customers | Seed customers with their orders, cases and pending reviews | Demo store + recorded cases |
| Support inbox | Queue, conversation (recorded messages only, case progression), **JARVIS Copilot** with distinct PROPOSED / APPROVED / EXECUTED / VERIFIED / ESCALATED states, policy, evidence, approval and audit link | Recorded cases |
| Automation catalog | Live refund workflow (Trigger → Evidence → AI → Policy → Action → Verification → Audit), requirements; previews run nothing | Static catalog + recorded counts |
| Cases, Approvals, Audit trail | Investigations; a review-only escalation queue with reasons; every engine audit event, filterable by kind and case | Recorded cases |
| Analytics | Date ranges (today/7/30/90 days/all), source filter, KPIs with previous-period comparison only when earlier records exist, cases over time, resolution vs escalation, refund outcomes, automation (AI-call) activity, support activity, orders by status, drill-down case report; a separate, labelled **Sample data** mode | Recorded cases (`apps/web/src/lib/analytics.ts`), or `sample-analytics.ts` |
| AI provider, Settings | Runtime truth from `/api/health`; setup choices, clearing recorded cases, security boundaries | Backend, this browser |

Recorded cases are copies of real `/cases` responses kept in this browser (newest 50) so deep links and date ranges survive a reload. Pages deep-link with hash routes (`#/analytics`, `#/case/<id>`), and browser back/forward works.

Nothing in these pages is invented: no revenue, ROI, chat history or fulfilment data. An empty session shows empty states. Browser checks: `apps/web/e2e/*.e2e.mjs` (Proof Mode, merchant journey, commerce console); screenshots in `docs/screenshots/`.

| Automation | Status |
|---|---|
| Refunds and returns (duplicate charges) | **Operational:** the full engine below |
| Risk and exceptions, Customer support, Order operations, Inventory alerts, Store analytics | **Preview:** shown with exactly what is not built; nothing runs |

**Demo store** (open with `#store`):
- Order lookup reads the backend seed (`GET /api/demo-store`).
- "Request a refund" sends that order's fixed request through `POST /cases`. It's a real case, and the merchant sees it.
- Customer free text needs an operator token in the public demo.
- "Connect your store" with a real domain is not available. No external store is read.

**Model providers:** one OpenAI-compatible adapter covers both hosted inference (AMD Token Factory, see `docs/TOKEN_FACTORY_SETUP.md`) and self-hosted vLLM on AMD GPUs (`docs/AMD_DEPLOYMENT_RUNBOOK.md`). Only `JARVIS_MODEL_BASE_URL`, `JARVIS_MODEL_NAME` and the server-side key differ. Without them, the app runs fixture AI and says so in the header.

## Requirements

- Node.js ≥ 24 (TypeScript runs natively; no build step for the API)

## Quick start

```bash
npm ci
npm ci --prefix apps/web
npm run api:typecheck && npm run api:test     # API: unit, engine, adapter, startup, ingress, e2e
npm run web:test && npm run web:build         # UI
npm run api:bench:ci                          # pinned 30-case fixture benchmark; fails on any unsafe action
npm run legacy:check                          # old prototype in legacy-prototype/ (reference only)
```

Local demo:

```bash
PORT=3000 npm run api:start          # terminal A (fixture mode by default)
npm run web:dev                      # terminal B → http://127.0.0.1:43123  (#store = demo store, #setup = onboarding)
npm run demo:verify                  # terminal C: 13 live checks (health, store, 3 outcomes, audit, refusals) before recording
```

## Demo scenarios

These four canonical requests run **without a token**. Each run gets a fresh synthetic world, so they can be repeated in any order.

| Scenario id | Request (customer · order) | Expected | Why |
|---|---|---|---|
| `valid-duplicate` | CUST-1001 · 48291 | `RESOLVED` | Two identical successful charges; refund of the later one is authorized, executed (simulated) and verified |
| `conflicting-amount` | CUST-1002 · 48292 | `ESCALATED` | The customer's stated $250 contradicts the records ($180) |
| `already-refunded` | CUST-1003 · 48293 | `CLOSED_NO_ACTION` | Already paid exactly once; nothing to refund |
| `prompt-injection` | CUST-1004 · 48294 | `ESCALATED` | Instruction-like text plus a $5,000 claim; the policy gate blocks it |

The exact messages are in `apps/api/src/fixtures.ts` (`SCENARIOS`) and `apps/web/src/fixtures/demo-scenarios.ts`. Escalation is a **correct safety outcome**, not a failure.

## How a request is handled

Every entry point (node server, Netlify, Vercel) uses one ingress guard (`apps/api/src/ingress.ts`). It runs **before any model call**:

1. Method, body size (64 KiB), JSON and schema validation.
2. **Request class:**
   - An exact canonical demo is **public**.
   - Anything else is **privileged** and needs `Authorization: Bearer $JARVIS_CASES_TOKEN`. That is a server-side secret, never in the UI bundle, compared in constant time.
   - With no token configured, free text is refused (403).
3. **Cost limits** (429 + `Retry-After`):
   - per-client rate (default 30/min);
   - global concurrency (default 2);
   - daily model-call budget. In vllm mode this is required, and each case reserves 2 calls.
4. The unchanged case engine:
   - understanding (AI) → evidence (deterministic) → proposal (AI);
   - policy authorization and revalidation (deterministic);
   - simulated gateway → read-back verification → terminal state.

The limits are in-process. They are a real global limit for one long-running server, **but only per instance on serverless**. That is why serverless hosts are fixture-only (see below).

## AI modes

| Mode | Adapters | Startup |
|---|---|---|
| `fixture` (default) | Deterministic fixture adapters | No endpoint, no network |
| `vllm` | `VllmRequestUnderstandingAdapter` + `VllmModelAdapter` on one OpenAI-compatible client | `GET /models` must list `JARVIS_MODEL_NAME`, and one synthetic probe per adapter must return schema-valid JSON. Otherwise the process exits 1. **Never falls back to fixture.** |

Live-model environment (server-side only; never in the browser or the repo): `JARVIS_AI_MODE=vllm`, `JARVIS_MODEL_BASE_URL`, `JARVIS_MODEL_NAME` (e.g. `DeepSeek-V4-Flash`), `JARVIS_MODEL_API_KEY`, `JARVIS_DAILY_MODEL_CALL_BUDGET` (required), optional `JARVIS_MODEL_STRUCTURED_OUTPUT` (`json_schema` | `json_object` | `off`), `JARVIS_MODEL_TIMEOUT_MS`, `JARVIS_MODEL_MAX_RETRIES`, `JARVIS_MODEL_MIN_INTERVAL_MS` (pacing), `JARVIS_UNDERSTANDING_MODEL_NAME` (optional second model for understanding). Free text needs `JARVIS_CASES_TOKEN`. The safest way to set the key is `scripts/live-gate.ps1` or `docs/submission/recording/start-live-api.ps1` (hidden prompt). Replies whose provider-reported model differs from the configured one fail closed.

Configuration: `apps/api/.env.example`. Real-model benchmark: `npm run api:bench:vllm -- --run <id>`. It writes `evals/results/duplicate-charge-eval.v1.vllm-<model>-<id>.json` and never touches the fixture results or baselines.

## Deployment

- **Netlify:** `netlify.toml` + `netlify/functions/*`.
- **Vercel:** `vercel.json` + `api/*`, deployed (fixture mode, no environment variables) at https://jarvis-actiii-preview.vercel.app; verified anonymously with `npm run demo:verify -- <url>` (13/13) on 16 Oct 2026.
- Both are thin wrappers over `apps/api/src/serverless.ts`. The public demo is **fixture AI with simulated payments**. Setting `JARVIS_AI_MODE=vllm` alone refuses cases (503); the implementation also has an explicit `JARVIS_SERVERLESS_REAL_MODEL=enabled` opt-in. That opt-in is not evidence of globally enforced quotas or permission to enable public paid inference.
- Real-model inference belongs on a **private long-running host** (`npm run api:start` with `JARVIS_AI_MODE=vllm`).

For public-demo verification, use `npm run demo:verify -- --fixture --evidence <output.json> https://jarvis-actiii-preview.vercel.app`. This checks all four scenarios, fixture adapter attribution, synthetic data, simulated payments, authorization refusals and audit evidence. It makes synthetic demo requests; it does not deploy anything.

## Security limitations (known)

- Rate, concurrency and budget limits are in-memory. They are not global across serverless instances, and the budget resets when the process restarts.
- One shared bearer token. No per-user identity, rotation or audit of token use.
- No TLS termination in the node server; run it behind a TLS proxy and set `JARVIS_TRUST_PROXY=1` only behind a trusted one.
- The payment gateway is simulated. There is no real payment integration.

## Documents

| Doc | Purpose |
|---|---|
| `docs/ACTIII_ENGINEERING_HANDOVER.md` | Current state: commits, verification, readiness, next task |
| `docs/IMPLEMENTATION_STATUS.md` | Status of record (IMPLEMENTED / VERIFIED / NOT DONE) |
| `docs/AMD_EVIDENCE.md` | Live AMD hosted-inference evidence (14 Oct 2026), Gemma status, reproduction steps |
| `docs/SUBMISSION.md` | Submission text: positioning, descriptions, tags, architecture, demo outline, checklist |
| `docs/DEMO_SCRIPT.md` | Timed 3-minute judge demo across the merchant workspace; demonstrated versus future |
| `docs/STORYBOARD.md` | Shot list mapped to real screenshots in `docs/screenshots/` |
| `docs/OWNER_RUNBOOK.md` | Windows PowerShell runbook: pull, install, AMD model discovery and first call, real-model mode, verification, benchmark, Vercel preview, judge access, recording |
| `docs/SUBMISSION_PREFLIGHT.md` | Public submission requirements versus current status; slide outline |
| `docs/BUSINESS_EVIDENCE.md` | Measured benchmark facts versus assumption-labelled value estimates |
| `docs/AMD_DEPLOYMENT_RUNBOOK.md` | Step-by-step real-model run on AMD Developer Cloud (plus RX 6800 notes) |
| `docs/TOKEN_FACTORY_SETUP.md` | Connect a hosted OpenAI-compatible endpoint (AMD Token Factory): verification, Windows PowerShell steps (`scripts/tokenfactory-smoke.ps1`), env, Vercel server-side opt-in |
| `docs/VERCEL_PREVIEW_SETUP.md` | Safe fixture-only Vercel preview via CLI (no production, no `master`) |
| `docs/EVOLUS_INTEGRATION.md` | Evolus requirements, intended two-block design, blockers |
| `docs/KICKOFF_IMPLEMENTATION_PACKAGE.md` | Prompt contracts, failure mapping, test matrix, smoke and benchmark plan |
| `docs/JARVIS_ACT_III_BUILD_CONTRACT.md` | Product and authority contract |
| `TESTING_GUIDE.md`, `NETLIFY_DEPLOY.md` | Verification and Netlify notes |
| `FINAL_STATUS.md`, `CONTINUATION_GUIDE.md`, `KICKOFF_PLAN.md`, `CURSOR_*`, `HANDOFF_MANIFEST.md`, `FINAL_HANDOVER_SHA256.txt` | Historical pre-kickoff and Cursor-era docs; superseded by the handover above |

Benchmark figures shown in the UI are **fixture results, not AMD or real-model results**, and are labelled as such. The live AMD benchmark result is in `evals/results/duplicate-charge-eval.v1.vllm-deepseek-v4-flash-tf-1.json`. Submission material: `docs/submission/`.
