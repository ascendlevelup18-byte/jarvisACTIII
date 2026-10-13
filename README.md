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

> **Truth labels:**
> - Payments are **simulated** and data is **synthetic**.
> - The public demo runs **fixture AI** (deterministic adapters).
> - The real-model (vLLM / OpenAI-compatible) path is implemented and tested **against a local fake server only**. **No AMD GPU inference has been run yet.** See `docs/AMD_EVIDENCE.md`.

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
npm run web:dev                      # terminal B → http://127.0.0.1:43123
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

Configuration: `apps/api/.env.example`. Real-model benchmark: `npm run api:bench:vllm -- --run <id>`. It writes `evals/results/duplicate-charge-eval.v1.vllm-<model>-<id>.json` and never touches the fixture results or baselines.

## Deployment

- **Netlify:** `netlify.toml` + `netlify/functions/*`.
- **Vercel:** `vercel.json` + `api/*`, prepared and locally tested, **not deployed**.
- Both are thin wrappers over `apps/api/src/serverless.ts` and are **fixture-only**. A deployment configured with `JARVIS_AI_MODE=vllm` refuses cases (503) instead of silently serving fixtures.
- Real-model inference belongs on a **private long-running host** (`npm run api:start` with `JARVIS_AI_MODE=vllm`).

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
| `docs/AMD_EVIDENCE.md` | Evidence template for the first real-GPU runs (all fields unverified until filled) |
| `docs/SUBMISSION.md` | Submission text: positioning, descriptions, tags, architecture, demo outline, checklist |
| `docs/DEMO_SCRIPT.md` | Timed judge demo using Proof Mode; demonstrated versus future |
| `docs/BUSINESS_EVIDENCE.md` | Measured benchmark facts versus assumption-labelled value estimates |
| `docs/AMD_DEPLOYMENT_RUNBOOK.md` | Step-by-step real-model run on AMD Developer Cloud (plus RX 6800 notes) |
| `docs/TOKEN_FACTORY_SETUP.md` | Connect a hosted OpenAI-compatible endpoint (AMD Token Factory): verification, env, Vercel server-side opt-in |
| `docs/VERCEL_PREVIEW_SETUP.md` | Safe fixture-only Vercel preview via CLI (no production, no `master`) |
| `docs/EVOLUS_INTEGRATION.md` | Evolus requirements, intended two-block design, blockers |
| `docs/KICKOFF_IMPLEMENTATION_PACKAGE.md` | Prompt contracts, failure mapping, test matrix, smoke and benchmark plan |
| `docs/JARVIS_ACT_III_BUILD_CONTRACT.md` | Product and authority contract |
| `TESTING_GUIDE.md`, `NETLIFY_DEPLOY.md` | Verification and Netlify notes |
| `FINAL_STATUS.md`, `CONTINUATION_GUIDE.md`, `KICKOFF_PLAN.md`, `CURSOR_*`, `HANDOFF_MANIFEST.md`, `FINAL_HANDOVER_SHA256.txt` | Historical pre-kickoff and Cursor-era docs; superseded by the handover above |

Benchmark figures shown in the UI are **fixture results, not AMD or real-model results**, and are labelled as such.
