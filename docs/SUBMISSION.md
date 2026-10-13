# JARVIS: submission text (draft)

Every claim here must stay true at submission time. Update §Evidence once real AMD runs exist (`docs/AMD_EVIDENCE.md`). Until then, keep the fixture and fake-server labels.

## Title

JARVIS Automations: a commerce operations workspace whose AI can propose, but only verified, policy-approved code can move money

## Positioning

- **One sentence:** JARVIS is an operations agent for ecommerce payment exceptions. An open model on AMD reads each duplicate-charge case and proposes a fix, but only deterministic policy code can let money move, and only a verified result closes the case.
- **Target customer:** support and payments-operations teams at online merchants and marketplaces who handle "I was charged twice" tickets by hand today.
- **Pain point:**
  - Duplicate-charge tickets are repetitive but financially risky.
  - Refunding the wrong charge, refunding twice, or acting on a customer's misstated amount costs real money.
  - A plain LLM agent can be talked into all three.
- **Why it matters:** the work is high-volume and rule-shaped, so it is a natural fit for automation, but only if the automation can prove it won't move money unsafely. JARVIS's design and benchmark target exactly that.

## Product (what judges see)

JARVIS Automations is a merchant operations workspace:
- **Dashboard** and **Analytics**: case outcomes, verified simulated refunds, pending reviews and AI-call activity, all computed from recorded cases. Every chart drills into its cases. A separate, labelled sample mode illustrates scale.
- **Orders** and **Customers**: the demo store joined with JARVIS's decisions (payment, refund and verification state; decision history).
- **Support inbox** with a **JARVIS Copilot**: recorded conversation on one side; on the other, the AI proposal, policy decision, evidence and approval need. PROPOSED, APPROVED, EXECUTED, VERIFIED and ESCALATED are kept as distinct states.
- **Approvals** (review-only), **Audit trail** (every engine event, filterable) and **Proof Mode** (side-by-side safe vs unsafe runs).
- A customer-facing **demo store** whose support widget sends real cases.

The flagship live automation is duplicate-charge refund resolution. The other modules are clearly marked previews.

## Product differentiation

- **Authority split, enforced in code.** Most "AI agent" demos let the model call the refund tool. Here the model only proposes. Amounts come from records, and policy, revalidation, execution and verification are deterministic.
- **Proof, not claims.** Every decision ships with its evidence, failed checks and a replayable audit; the UI never shows a refund as done before read-back.
- **Measured safety.** A pinned adversarial benchmark gates CI at 0 unsafe actions.
- **Honest operations UI.** Analytics and the inbox show only recorded data; sample data is separated and labelled; previews do nothing.
- **Provider-portable.** One OpenAI-compatible adapter covers hosted AMD Token Factory and self-hosted vLLM on AMD GPUs, and startup fails closed.

## Short description

JARVIS resolves duplicate-charge complaints end to end:
- An open model on AMD reads the case and proposes a fix.
- Deterministic policy code decides whether money may move.
- Every refund is verified, and every step is audited.
- Contradictory, adversarial or out-of-policy cases are escalated, never guessed.

## Long description

Ecommerce operations teams handle a steady stream of payment exceptions. Duplicate charges are common, costly when mishandled, and dangerous to automate naively. An LLM that can issue refunds can be talked into issuing the wrong ones.

JARVIS splits the work along a trust boundary:
- **The AI model** (an open model served by vLLM, intended for AMD GPUs):
  - classifies the customer's request;
  - extracts the amounts they state;
  - proposes a structured decision: refund a specific duplicate charge, take no action, or escalate.
  - Its output must match a strict schema. Anything else fails closed.
- **Deterministic code** owns everything with authority:
  - deriving the refund amount from the system of record;
  - policy thresholds;
  - transaction coherence;
  - checking evidence the model cites;
  - permissions and idempotency;
  - re-validating state immediately before execution;
  - calling the payment gateway;
  - verifying the result by reading it back;
  - every state transition.

A case reaches `RESOLVED` only after the refund is verified. Contradictions (the customer's stated amount against the records), prompt-injection attempts, already-refunded orders and out-of-scope requests (full cancellation, general refunds) end in `ESCALATED` or `CLOSED_NO_ACTION`, with the failed checks recorded for a human.

**Public demo:**
- Four canonical scenarios, repeatable in any order: valid duplicate, conflicting amount, already refunded, adversarial message.
- Each runs in a fresh synthetic world with a simulated gateway.
- Free-text cases require a server-side token, and all cases pass rate, concurrency and model-call-budget limits before any model call.

## Technology tags

TypeScript · Node.js · React · Vite · vLLM · OpenAI-compatible API · AMD ROCm (target) · AMD Developer Cloud (target) · Zod · structured output (JSON Schema) · deterministic policy engine · Netlify · Vercel

## Architecture overview

```
customer message
  → ingress guard (demo allowlist | bearer token; rate / concurrency / budget)   ← before any model call
  → AI understanding (intent + stated amounts; strict schema)                   ← untrusted
  → evidence gathering (order, charges, refunds, duplicate groups, contradictions) ← deterministic
  → AI decision proposal (REFUND_DUPLICATE | NO_ACTION | ESCALATE; strict schema) ← untrusted
  → policy authorization (amount from records, thresholds, coherence, refs)      ← deterministic
  → revalidation against current state (no stale evidence)                       ← deterministic
  → simulated payment gateway (idempotent)                                       ← deterministic
  → read-back verification → RESOLVED | ESCALATED | CLOSED_NO_ACTION | FAILED
  → full audit trail
```

- Prompts put customer text and evidence only in the user message, as JSON. System prompts contain no case data and are versioned by sha256.
- Real-model startup fails closed: the model must be listed by the endpoint and pass schema probes.

## AMD integration

- **Path 1: hosted AMD Token Factory.** Configure `JARVIS_AI_MODE=vllm`, base URL, model id and a server-side key. The key never reaches the browser; a test enforces this. Verification procedure: `docs/TOKEN_FACTORY_SETUP.md` and `scripts/tokenfactory-smoke.ps1`.
- **Path 2: self-hosted vLLM on AMD Instinct (ROCm).** The same adapter; `docs/AMD_DEPLOYMENT_RUNBOOK.md`.
- **Fail-closed startup.** The model must be listed by `/models` and pass one schema probe per adapter, or the process exits 1. There is never a fixture fallback.
- **Benchmark.** `npm run api:bench:vllm` measures the real model on the same pinned 30 cases (gate: 0 unsafe).
- **Status: not yet run.** No AMD inference has happened. The base URL is a candidate from search results (an AMD domain) that the sandbox could not open. The model id must come from live `/models`.

## Evidence (only what has been measured)

| Claim | Evidence | Status |
|---|---|---|
| 0 unsafe autonomous actions on the pinned 30-case benchmark | `npm run api:bench:ci`: 29/30 pass, 0 unsafe, Safe Resolution 96.7%, Correct Escalation 100%. The one miss (DC-S04) is a conservative escalation | Fixture model only |
| Fail-closed on malformed, refused, truncated or injected model output | `apps/api/test/vllm-adapters.test.ts` (§G matrix) | Fake server only |
| Unauthorized and over-budget requests never reach the model | `apps/api/test/ingress.test.ts`, `ingress-e2e.test.ts` | Local tests |
| The three demo paths behave correctly on the running backend | `POST /cases` (13 Oct 2026, fixture): #48291 RESOLVED, APPROVE, executed and verified, $89.99, 16 audit events. #48294 ESCALATED, DENY, not executed, $0. #48293 CLOSED_NO_ACTION, NO_ACTION, $0. Free text without a token: 403 | Fixture model; also covered by browser e2e |
| The UI never reports an unverified or blocked refund as done | Web unit tests (70) and browser e2e (30 checks across 3 suites) | Local tests |
| CI | GitHub Actions `ci` green on the pushed head (dataset hash, typecheck, API/web/legacy tests, build, benchmark gate, drift check) | Verified |
| Real-model accuracy, latency, AMD GPU usage | `docs/AMD_EVIDENCE.md` | **NOT YET MEASURED** |

**Value proposition (no invented numbers):**
- The system automates the safe majority of duplicate-charge cases.
- It refuses to automate the unsafe ones, and the dataset includes adversarial and contradictory cases to prove it.
- Business-impact figures (time saved, cost) have **not** been measured and must not be claimed.

## Deployment prerequisites

- Node ≥ 24.
- **Public demo:** Netlify or Vercel, fixture mode only. Optional `JARVIS_CASES_TOKEN` (≥ 24 chars, server-side env) to enable free-text cases.
- **Real model:** a private, authenticated OpenAI-compatible endpoint (vLLM on AMD), running `npm run api:start` with these env vars:
  - `JARVIS_AI_MODE=vllm`
  - `JARVIS_MODEL_BASE_URL`, `JARVIS_MODEL_NAME`, `JARVIS_MODEL_API_KEY`
  - an explicit `JARVIS_DAILY_MODEL_CALL_BUDGET`

## Known limitations

- **No live AMD inference yet**: fixture AI in every measurement so far.
- **Simulated payments, synthetic store**: no real store connection, fulfilment or sales data.
- **Recorded cases are per browser** (local storage), not a shared database. Analytics covers what this browser recorded.
- **Approvals are review-only**: there is no human-approval execution path. Free-text chat needs an operator token.
- **Five of six automation modules are previews.**
- **Serverless limits are per instance** (see below).

## Security limitations

See `README.md` §Security limitations:
- in-memory limits (not global on serverless);
- a single shared token;
- no built-in TLS;
- a simulated gateway.

## Submission checklist

| Item | Status | Where / next step |
|---|---|---|
| Title, short and long description, tags | Drafted | This file |
| Architecture overview | Drafted | This file; README |
| Public GitHub repository | Repo exists; visibility is the owner's call | Do not change visibility without approval |
| Setup and reproduction instructions | Done | README §Quick start, `docs/AMD_DEPLOYMENT_RUNBOOK.md` |
| Working demo URL | **Unverified.** A Vercel deployment exists at `jarvis-actiii-preview.vercel.app` (earlier build), but this sandbox cannot reach vercel.app and the connector lacks project access, so its contents and protection state are unconfirmed. Redeploy the current head with the CLI | `docs/VERCEL_PREVIEW_SETUP.md` |
| Evidence of AMD usage | **Not yet.** Runbook and template ready | `docs/AMD_DEPLOYMENT_RUNBOOK.md` → `docs/AMD_EVIDENCE.md` |
| Evolus partner track (≥ 2 building blocks on the event workspace) | **Not started.** No workspace access or API docs | `docs/EVOLUS_INTEGRATION.md` |
| Business value | Measured safety profile plus an assumption-labelled sensitivity table | `docs/BUSINESS_EVIDENCE.md` |
| CI | **Green** on the pushed branch head | `.github/workflows/ci.yml` |
| Demo script and storyboard | Done | `docs/DEMO_SCRIPT.md` (3:00), `docs/STORYBOARD.md` (real screenshots) |
| Reproducible technical results | Fixture benchmark: yes. Real model: not yet | `npm run api:bench:ci`; `api:bench:vllm` after AMD |
| Cover image, MP4 video, PDF slides | Not started (by design, after real results) | Use only measured claims |

## Demo outline

See `docs/DEMO_SCRIPT.md`: a timed 2–3 minute script using Proof Mode (safety showdown, proof chain, audit trail), plus a demonstrated-versus-future table.

## Suggested PR #1 description (the current one covers only G1/G2)

> **ACT III development: real-model adapters, fail-closed startup, guarded ingress, serverless demo**
>
> All work since the pre-hackathon baseline (`master` @ `5b5a5fe`). No changes to the engine core (`contracts`, `case-engine`, `policy-engine`, `evidence`, `intent-cues`, `money`, `state-machine`, `gateway`, `fixtures`), `data/` or `evals/`.
>
> - **G1:** OpenAI-compatible client fixes. Truncation is rejected, body-read timeouts are mapped, `listModels()` is added, and model-call timeouts have a single source of truth.
> - **G2:** vLLM understanding and decision adapters. Strict JSON-schema output; customer text and evidence go only in the user message as JSON. No JSON extraction from prose; malformed output fails closed.
> - **G3:** vLLM startup requires the model in `/models` plus schema-valid probes, else exit 1, never a fixture fallback. Full-system-prompt versioning. Opt-in `api:bench:vllm`.
> - **Sprint 2:** shared ingress guard. The four canonical demos run without a token in fresh worlds; free text needs a server-side bearer token. Rate, concurrency and model-call budget limits apply before any model call. Netlify and Vercel wrappers are fixture-only.
> - **Merchant workspace:** onboarding, demo store, Dashboard, Orders, Customers, Support inbox + Copilot, Analytics (aggregation layer, drill-down, labelled sample mode), review-only Approvals, filterable Audit trail, deep links.
> - **Verified:** API 225 tests, web 70, legacy 58, browser e2e 30 checks; fixture benchmark 29/30 with 0 unsafe; dataset hash unchanged. **Not verified:** any real model or AMD inference (fake server only); Vercel deployment (build verified locally only).

## Not done (do not claim)

- AMD GPU inference and any real-model metric.
- Evolus integration (no official workspace docs or access yet).
- Any public real-model deployment.
- Any public demo URL (the Vercel preview is blocked on project creation).
- Video, slides and cover image.
