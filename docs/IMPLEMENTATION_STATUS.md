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
| Tests | `npm run api:test` | 30 tests, 30 pass, 0 fail |
| API smoke test | `npm run api:start`, then `POST /cases` for each fixture | see below |

API smoke-test results:

| Fixture | HTTP | Final state | Reason |
|---|---|---|---|
| Valid duplicate (order 48291) | 200 | `RESOLVED` | refund verified by read-back |
| Conflicting amount (48292: $250 asked, $180 verified) | 200 | `ESCALATED` | `NO_CONTRADICTIONS` |
| Already refunded (48293) | 200 | `ESCALATED` | `NOT_ALREADY_REFUNDED` |
| Prompt injection (48294) | 200 | `ESCALATED` | `NO_CONTRADICTIONS` |

The tests verify the following behavior:

- **State machine.** Cases move `RECEIVED → EVIDENCE_GATHERING → ANALYZING → DECISION_PROPOSED → POLICY_VALIDATION → APPROVED → EXECUTING → VERIFYING → RESOLVED`. The terminal exits are `ESCALATED`, `FAILED` and `CLOSED_NO_ACTION`.
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

## PROPOSED: not implemented

| Area | Status |
|---|---|
| AMD (Developer Cloud, ROCm, vLLM, open model) | No code and no endpoint |
| Evolus (extractor, knowledge library, workflow) | No code and no API access |
| Real model, including local Colibri (Gate 0) | Not integrated or validated; only `FixtureModelAdapter` exists |
| UI (command center, case workspace) | None |
| Benchmark suite (30-case dataset, safe-resolution rate) | None. The 30 unit/integration tests are **not** the benchmark |
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
