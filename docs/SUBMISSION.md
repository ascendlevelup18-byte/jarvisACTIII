# JARVIS: submission text (draft)

Every claim here must stay true at submission time. Update §Evidence once real AMD runs exist (`docs/AMD_EVIDENCE.md`). Until then, keep the fixture and fake-server labels.

## Title

JARVIS: an AI operations agent that resolves duplicate charges safely, or escalates

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

## Not done (do not claim)

- AMD GPU inference and any real-model metric.
- Evolus integration (no official workspace docs or access yet).
- Any public real-model deployment.
- Video, slides and cover image.
