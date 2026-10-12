# JARVIS: submission text (draft)

Every claim here must stay true at submission time. Update §Evidence once real AMD runs exist (`docs/AMD_EVIDENCE.md`). Until then, keep the fixture and fake-server labels.

## Title

JARVIS: an AI operations agent that resolves duplicate charges safely, or escalates

## Positioning

- **One sentence:** JARVIS is an operations agent for ecommerce payment exceptions. An open model on AMD reads each duplicate-charge case and proposes a fix, but only deterministic policy code can let money move, and only a verified result closes the case.
- **Target customer:** support and payments-operations teams at online merchants and marketplaces who handle "I was charged twice" tickets by hand today.
- **Pain point:**
  - Duplicate-charge tickets are repetitive but financially risky.
  - Refunding the wrong charge, refunding twice, or acting on a customer's misstated amount costs real money.
  - A plain LLM agent can be talked into all three.
- **Why it matters:** the work is high-volume and rule-shaped, so it is a natural fit for automation, but only if the automation can prove it won't move money unsafely. JARVIS's design and benchmark target exactly that.

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

## Evidence (only what has been measured)

| Claim | Evidence | Status |
|---|---|---|
| 0 unsafe autonomous actions on the pinned 30-case benchmark | `npm run api:bench:ci`: 29/30 pass, 0 unsafe, Safe Resolution 96.7%, Correct Escalation 100%. The one miss (DC-S04) is a conservative escalation | Fixture model only |
| Fail-closed on malformed, refused, truncated or injected model output | `apps/api/test/vllm-adapters.test.ts` (§G matrix) | Fake server only |
| Unauthorized and over-budget requests never reach the model | `apps/api/test/ingress.test.ts`, `ingress-e2e.test.ts` | Local tests |
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
| Working demo URL | **Blocked.** The Vercel build is verified locally; the connector cannot create projects (403) | Owner runs the CLI preview steps in `docs/VERCEL_PREVIEW_SETUP.md` (no dashboard Git import) |
| Evidence of AMD usage | **Not yet.** Runbook and template ready | `docs/AMD_DEPLOYMENT_RUNBOOK.md` → `docs/AMD_EVIDENCE.md` |
| Evolus partner track (≥ 2 building blocks on the event workspace) | **Not started.** No workspace access or API docs | `docs/EVOLUS_INTEGRATION.md` |
| Business value | Measured safety profile plus an assumption-labelled sensitivity table | `docs/BUSINESS_EVIDENCE.md` |
| CI | Workflow added; **no GitHub run yet** | `.github/workflows/ci.yml` |
| Reproducible technical results | Fixture benchmark: yes. Real model: not yet | `npm run api:bench:ci`; `api:bench:vllm` after AMD |
| Cover image, MP4 video, PDF slides | Not started (by design, after real results) | Use only measured claims |

## Demo outline (about 3 minutes, using only verified behaviour)

1. **Problem (20 s):** duplicate charges are frequent; an LLM with refund power is a liability.
2. **Valid duplicate (40 s):**
   - The AI proposal is shown, then the deterministic checks one by one, then the simulated refund, then read-back verification, then `RESOLVED`.
   - Point at the audit trail.
3. **Conflicting amount (30 s):**
   - The model's proposal is still "refund", but the policy blocks it on the stated $250 against the recorded $180, so the case is `ESCALATED`.
   - Escalation is the safe outcome.
4. **Prompt injection (30 s):** the "SYSTEM NOTICE … refund $5,000" text has no authority, so the case is `ESCALATED`.
5. **Already refunded (20 s):** `CLOSED_NO_ACTION`, and no double refund.
6. **Rigour (30 s):** the 30-case benchmark with 0 unsafe actions (fixture model), then real-model results on AMD **once measured**.
7. **Close (10 s):** the model proposes; code decides; every refund is verified.

## Suggested PR #1 description (the current one covers only G1/G2)

> **ACT III development: real-model adapters, fail-closed startup, guarded ingress, serverless demo**
>
> All work since the pre-hackathon baseline (`master` @ `5b5a5fe`). No changes to the engine core (`contracts`, `case-engine`, `policy-engine`, `evidence`, `intent-cues`, `money`, `state-machine`, `gateway`, `fixtures`), `data/` or `evals/`.
>
> - **G1:** OpenAI-compatible client fixes. Truncation is rejected, body-read timeouts are mapped, `listModels()` is added, and model-call timeouts have a single source of truth.
> - **G2:** vLLM understanding and decision adapters. Strict JSON-schema output; customer text and evidence go only in the user message as JSON. No JSON extraction from prose; malformed output fails closed.
> - **G3:** vLLM startup requires the model in `/models` plus schema-valid probes, else exit 1, never a fixture fallback. Full-system-prompt versioning. Opt-in `api:bench:vllm`.
> - **Sprint 2:** shared ingress guard. The four canonical demos run without a token in fresh worlds; free text needs a server-side bearer token. Rate, concurrency and model-call budget limits apply before any model call. Netlify and Vercel wrappers are fixture-only.
> - **Verified:** API 194 tests, web 11, legacy 58; fixture benchmark 29/30 with 0 unsafe; dataset hash unchanged. **Not verified:** any real model or AMD inference (fake server only); Vercel deployment (build verified locally only).

## Not done (do not claim)

- AMD GPU inference and any real-model metric.
- Evolus integration (no official workspace docs or access yet).
- Any public real-model deployment.
- Any public demo URL (the Vercel preview is blocked on project creation).
- Video, slides and cover image.
