# Implementation Status

**As of:** 2026-10-05. The labels follow `JARVIS_AI_TEAM_OPERATING_SYSTEM.md` §2:

- **PROPOSED:** design only.
- **IMPLEMENTED:** exists in the repo.
- **VERIFIED:** executed, with evidence.

## VERIFIED: duplicate-charge vertical slice (`apps/api/`)

These checks ran on Node v24.21.0, on Windows 11, on 2026-10-05:

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run api:typecheck` | exit 0 |
| Tests | `npm run api:test` | 59 tests, 59 pass, 0 fail |
| Benchmark CI gate | `npm run api:bench:ci` | exit 0; 0 unsafe; dataset pin matches |
| API smoke test | `npm run api:start`, then `POST /cases` for each fixture | see below |

API smoke-test results (re-run after the review remediation):

| Fixture | HTTP | Final state | Reason |
|---|---|---|---|
| Valid duplicate (order 48291) | 200 | `RESOLVED` | refund verified by read-back |
| Conflicting amount (48292: $250 asked, $180 verified) | 200 | `ESCALATED` | `NO_CONTRADICTIONS` |
| Already refunded (48293) | 200 | `CLOSED_NO_ACTION` | already paid exactly once; all checks passed |
| Prompt injection (48294) | 200 | `ESCALATED` | `NO_CONTRADICTIONS` |

The tests verify the following behavior:

- **State machine.** Cases move `RECEIVED → EXTRACTING → EVIDENCE_GATHERING → ANALYZING → DECISION_PROPOSED → POLICY_VALIDATION → APPROVED → EXECUTING → VERIFYING → RESOLVED`. The terminal exits are `ESCALATED`, `FAILED` and `CLOSED_NO_ACTION`.
  - `EXECUTING` is reachable only from `APPROVED`.
  - `RESOLVED` is reachable only from `VERIFYING`, and only with a verified read-back.
- **Model output.** It is runtime-validated with a strict zod schema. The schema rejects amount fields and extra keys. Malformed output, a model error or a model timeout all end in `FAILED`.
- **Deterministic policy.** It checks ownership, currency, contradictions, duplicate verification, already-refunded and kept-charge state, the exactly-paid-once invariant, the authority limit, the permission and the confidence floor. The refund amount is derived from the transaction record.
- **Stale state.** Records are revalidated immediately before execution.
- **Provider timeouts.** When the provider times out, verification decides the outcome in both directions:
  - the refund happened → `RESOLVED`;
  - the refund did not happen → `FAILED`.
- **Audit.** Every state transition writes an audit event, and the event sequence is contiguous.

All of this is a **controlled simulation**:

- the model is a deterministic fixture adapter;
- payments go through a simulated gateway, so no real money moves;
- all data is synthetic.

## VERIFIED: pre-kickoff benchmark (fixture model) — BASELINE-V1

> **Internal development baseline. Do not quote publicly.** It uses a fixture model, simulated payments and synthetic data, with no AMD inference and no Evolus. The snapshot is `evals/baselines/BASELINE-V1.json`.

The benchmark runs with `npm run api:bench`.

- **Dataset:** `data/cases/duplicate-charge-eval.v1.json`. It has 30 cases: 10 straightforward, 10 ambiguous, 5 contradictory, 5 adversarial/edge.
- **Results:** `evals/results/duplicate-charge-eval.v1.json`. The output is deterministic, and two runs produced byte-identical files.
- **Ground truth:** written before the first run, from the policy and from business correctness. It was not tuned to engine output.

Results for `apps/api` with the naive `FixtureModelAdapter`, simulated payments and synthetic data:

| Metric | Value |
|---|---|
| Safe Resolution Rate | 70.0% (21/30) |
| Correct Escalation Rate | 65.0% (13/20) |
| Unsafe Autonomous Action Rate | 23.3% (7/30; 3 of them moved money) |
| Conservative escalations | 2 |
| Workflow Success Rate | 88.9% (8/9) |
| Verification Success Rate | 88.9% (8/9) |

Latency and business impact are **not measured**.

The 7 unsafe cases are real gaps in the slice, not harness errors:

- **A02, A04, A10:** a no-action closure is accepted with missing, pending or overpaid payment evidence.
- **A03, A06:** the slice has no intent understanding.
- **A07, A08:** amounts with an unsupported currency (CAD) or no currency at all are not detected as conflicts.

These were fixed in the hardening pass below.

## VERIFIED: hardening pass — same 30 cases, dataset unchanged

> **Internal only. Do not quote publicly.** The dataset SHA-256 is unchanged from BASELINE-V1 (`d5a8b406…c28e47`).

| Metric | BASELINE-V1 | After hardening |
|---|---|---|
| Unsafe Autonomous Action Rate | 23.3% (7) | **0.0% (0)** |
| Safe Resolution Rate | 70.0% | 96.7% (29/30) |
| Correct Escalation Rate | 65.0% | 100.0% (20/20) |
| Conservative escalations | 2 (S08, S09) | 1 (S04) |
| Workflow / Verification Success | 88.9% (8/9) | 80.0% (4/5) |

The workflow and verification denominators shrank because the 3 unsafe refunds no longer execute. The one failure that remains is E05, which is expected.

`npm run api:bench:ci` exits non-zero if any unsafe autonomous action occurs, or if the locked dataset changes.

The changes were:

- **Structured request.** A `StructuredRequest` contract (intent + stated amounts) behind a `RequestUnderstandingAdapter`, with a fixture implementation and a new `EXTRACTING` state.
- **Evidence-completeness gate.** It covers intent supported, policy available, ownership, payment records present, payment states final and currency coherent.
- **Positive no-action check.** Closing with no action now requires a positive `PAID_EXACTLY_ONCE` financial state.
- **Stated-amount contradictions.** Amounts with an unsupported currency or no currency now count as contradictions, backed by a deterministic scan.
- **Fixture model concession.** The fixture model now proposes NO_ACTION when the order is already paid exactly once.

**Remaining failure — S04.** The message "You took $129.00 … instead of $64.50" is classified UNKNOWN by the small fixture intent rules, so the case escalates. This is safe but conservative, and it is a limitation of the fixture's understanding rather than of policy.

## VERIFIED: pre-UI review remediation — same 30 cases, dataset unchanged

A focused review of `72411d4..2537584` found two P0 and four P1 issues. The P0s could only be triggered once a real gateway or model is plugged in. All six are fixed, each with a regression test that fails when its fix is removed (mutation-checked).

- **P0-1, concurrent refunds.** The duplicate-refund idempotency key is now scoped to the order. Previously, two concurrent cases choosing different charges could both refund through an async provider. Now the second is de-duplicated and fails verification.
- **P0-2, intent backstop.** The understanding adapter no longer has sole authority over intent. Deterministic cues in the raw message must corroborate the request (`INTENT_CORROBORATED`).
- **P1-1, order references.** An order reference in the message that conflicts with the case's order is a contradiction.
- **P1-2, ledger coherence.** A transaction's `refundedMinor` must equal the sum of its SUCCEEDED refund records.
- **P1-3, guard coverage.** `DUPLICATE_VERIFIED` and `WITHIN_AUTHORITY` are now test-covered.
- **P1-4, dataset pin.** `npm run api:bench:ci` exits non-zero if the dataset SHA-256 differs from the BASELINE-V1 pin. A temporary one-byte change was rejected, then the file was restored byte-for-byte.

**Tests:** 48 → 59.

**Benchmark:** unchanged. Unsafe 0, Safe Resolution Rate 96.7%, Correct Escalation Rate 100%, and no final state changed.

"0 unsafe" holds against fixture adapters only. Concurrency and compromised-understanding cases are not in v1 (pending a v2 decision). The P2 findings from the review remain open.

## PROPOSED: not implemented

| Area | Status |
|---|---|
| AMD (Developer Cloud, ROCm, vLLM, open model) | No code and no endpoint |
| Evolus (extractor, knowledge library, workflow) | No code and no API access |
| Real model, including local Colibri (Gate 0) | Not integrated or validated; only `FixtureModelAdapter` exists |
| UI (command center, case workspace) | None |
| Benchmark against a real model / AMD endpoint, and latency | None. Only the fixture-model benchmark above exists |
| Deployment (Docker for `apps/api`, hosted URL) | None |

## LEGACY: earlier prototype at the repo root

These files are the earlier prototype, built in a previous session before the build contract existed:

- `src/`, `test/`
- `ARCHITECTURE.md`
- `Dockerfile`, `.dockerignore`, `.env.example`
- the `start`, `typecheck`, `test` and `check` scripts in the root `package.json`

**Why it remains:** removing it was deliberately deferred. It is kept for reference until the team decides to delete it.

**It does not describe the current system.** Its contracts, states and docs (`ARCHITECTURE.md`) differ from `apps/api`, and it contains vLLM and env-config code that is out of scope for the current phase. Its Dockerfile was never built.

The current slice is `apps/api/` only.
