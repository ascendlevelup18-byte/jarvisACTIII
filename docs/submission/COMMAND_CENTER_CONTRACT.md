# Command Center ↔ backend integration contract

For ChatGPT Work's `/#/command-center`. Only routes that exist today (`apps/api/src/server.ts` for the node server, `apps/api/src/serverless.ts` + `api/*.ts` on Vercel). Types are in `apps/api/src/contracts.ts`. Nothing here was changed in the frontend.

## 1. Endpoints

| Path | Method | Request | Response | Auth |
|---|---|---|---|---|
| `/api/health` | GET | none | runtime status (§3) | none |
| `/api/demo-store` | GET | none | `{ store: { name, data: "synthetic", payments: "simulated" }, orders: [{ orderId, customerId, customerName, totalMinor, currency, placedAt, charges: [{ id, amountMinor, currency, status, refundedMinor, at }], supportRequest: { scenario, message } }] }` | none |
| `/cases` (Vercel also `/api/cases`) | POST | `{ customerId, orderId, message }` | a full `Case` (§2) | none for the 4 canonical demo requests (exact `supportRequest.message`); anything else needs `Authorization: Bearer <JARVIS_CASES_TOKEN>` (server-side only; never in the browser) |

There is **no** endpoint to list cases, fetch a case by id, approve an escalation, or run a merchant command. Case history is whatever the browser keeps from `POST /cases` responses.

Errors from `POST /cases`: 400 `invalid_json` / `invalid_request`, 401 `unauthorized` (node server, free text without token), 403 `free_text_disabled` (no token configured, e.g. Vercel), 405 `method_not_allowed`, 413 `body_too_large`, 429 rate/concurrency/daily-budget denial with `retryAfterSec`, 503 `model_unavailable` / `ingress_misconfigured` on Vercel when the AI runtime cannot serve. Treat every non-200 as "not run": nothing was executed.

## 2. Decision Journey → `Case` fields

| Stage | Fields | Notes |
|---|---|---|
| INVESTIGATION | `understanding.intent`, `understanding.mentionedAmounts`; `evidence.order`, `evidence.transactions`, `evidence.refunds`, `evidence.duplicateGroups`, `evidence.contradictions`, `evidence.sourceIds` | `understanding` is model output (untrusted); `evidence` is from records |
| DECISION | `proposal.action` (REFUND_DUPLICATE · NO_ACTION · ESCALATE), `proposal.refundTransactionId`, `proposal.confidence`, `proposal.riskFlags`, `proposal.rationale` | Model proposal only; it has no authority. `rationale` is the model's stated summary, not hidden reasoning |
| CONTROL | `authorization.outcome` (APPROVE · DENY · NO_ACTION), `authorization.checks[] { rule, passed, detail }`, `authorization.action.amountMinor` | Deterministic policy; the amount is derived from records |
| OUTCOME | `state` (RESOLVED · ESCALATED · CLOSED_NO_ACTION · FAILED), `action { status, providerRefundId, error, attemptedAt }`, `reasons[] { code, detail }` | `action` is null unless policy approved; payments are simulated |
| PROOF | `verification { verified, observedRefund, detail }`, `audit[] { seq, at, type, from, to, data }` | Show RESOLVED only when `verification.verified === true` |

Any stage that is `null` should render as "not reached" (e.g. CONTROL after an unknown order; PROOF on escalations).

## 3. Provenance

| What | Where | Values |
|---|---|---|
| Live AI vs fixture | `/api/health.aiMode` | `vllm` (remote model) or `fixture` |
| Which model did each stage | `audit[].data.adapter` on UNDERSTANDING_CALL / MODEL_CALL | `vllm:<model>`, `fixture-…`, or `scripted-dataset-output` (benchmark only) |
| Configured models (node server) | `/api/health.models { understanding, decision }`, `/api/health.provider` | null in fixture mode |
| Simulated payments | `/api/health.paymentGateway`, `/api/demo-store.store.payments` | always `simulated` |
| Synthetic data | `/api/health.data`, `/api/demo-store.store.data` | `synthetic` |
| Human review | `state === "ESCALATED"` plus `reasons` | review only; no approve action exists |

**Not exposed:** "recorded prior inference" (replays of a live run) — there is no replay endpoint; show the evidence files instead. Vercel health has no `models` field (serverless real-model mode is off by default).

## 4. What the UI must not imply

A merchant command endpoint, approving/executing escalations, cross-browser case history, real payments, or a live Gemma path (currently unavailable: `docs/AMD_EVIDENCE.md`).

## 5. When Work freezes

1. Read Work's `CommandCenter.tsx` and route; map each displayed value to §2/§3; flag any value with no backend source.
2. Run `npm test`, `npm run web:build`, `npm run legacy:check`, `npm run api:bench:ci`, `npm run demo:verify`, `node scripts/hero-evidence.mjs` against a fixture API.
3. Commit the frontend separately from backend/docs; no `git add -A`.
