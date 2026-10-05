# JARVIS Core Architecture

## Root cause / requirement

A customer says they were charged twice. The system decides whether to refund one charge, and that decision involves real money. So:

- the LLM may **interpret** (extract, reason, propose), but must never be able to **cause** a refund that deterministic code could not independently justify;
- every path ends in exactly one terminal state: `resolved`, `closed_no_action` or `escalated`;
- every step is recorded so a human can reconstruct why.

## Proposed change (minimum architecture)

One Node 24 process, written in TypeScript with strict types. It runs `.ts` directly through Node's type stripping, so there is no build step. It has two runtime dependencies: `zod` and Node's standard library.

There's no web framework, agent framework, queue or database. In-memory stores sit behind small interfaces, so a real store or gateway can replace them later.

```
POST /cases ─► pipeline.processCase (linear, bounded, no loops)
   received ─► extracted ─► evidence_gathered ─► decided ─► approved ─► executed ─► resolved
      │            │              │                 │           │           │
      └────────────┴──────────────┴─────────────────┴───────────┴───────────┴──► escalated
                                                    └──► closed_no_action
```

| Step | Owner | Notes |
|---|---|---|
| 1 Ingest | code | `CaseInputSchema`. `customerId` comes from the authenticated channel, **never** from the LLM. |
| 2 Extract | **LLM** | Returns `ExtractionSchema` (issue type, order id, claimed amount *as text*). |
| 3 Order/txn evidence | code | Order must exist **and** belong to `customerId`. |
| 4 Policy | code | Versioned policy lookup by issue type: prose for the LLM, numeric params for the validator. |
| 5 Assemble evidence | code | Deterministic duplicate groups (same amount and currency, captured, within N minutes) and contradiction checks (claimed amount or currency mismatch). |
| 6–7 Reason / decide | **LLM** | Returns `DecisionSchema`: `refund_duplicate`, `no_action` or `escalate`, with tx IDs and confidence. **No money amount**: code derives it. |
| 8 Validate | code | Permission (kill switch), ID existence, same duplicate group, not already refunded, limit per currency, refund window, confidence floor, and the "order stays fully paid" invariant. |
| 9 Execute | code | `gateway.createRefund`. The idempotency key is derived from the **transaction**, not the case, so concurrent cases can't double-refund. |
| 10 Verify | code | Reads back from the gateway by idempotency key and checks tx, amount, currency and status. This also covers "timed out but actually succeeded". |
| 11 State | code | An explicit transition table. Illegal transitions throw, and the case escalates. |
| 12 Audit | code | Append-only events, including raw LLM output, model and latency. Optional JSONL file. |
| 13 Escalate | code | Any missing evidence, contradiction, invalid LLM output, LLM error, violation, execution failure or unexpected exception escalates with reason codes. |

## Files

```
src/contracts.ts   zod schemas + domain types (single source of truth)
src/money.ts       integer minor-unit parsing/formatting
src/policy.ts      policy registry + deterministic decision validator
src/evidence.ts    duplicate detection + evidence assembly
src/llm.ts         LlmClient interface, vLLM (OpenAI-compatible) client, offline stub, JSON parsing
src/prompts.ts     system/user prompts
src/store.ts       in-memory orders/txns/refunds/cases + demo fixtures
src/gateway.ts     PaymentsGateway interface + mock with fault injection
src/audit.ts       append-only audit log
src/pipeline.ts    orchestrator / state machine
src/server.ts      node:http routes
src/config.ts      env parsing
src/main.ts        wiring + listen
test/*.test.ts     node:test suites
```

## Data flow

`{customerId, message}` goes through these steps:

1. LLM returns `Extraction`.
2. Code looks up the `Order` and its `Transaction[]`/`Refund[]` and the `Policy`, then computes `DuplicateGroup[]` and contradictions. Together these are the `Evidence`.
3. LLM returns a `Decision`.
4. `validateDecision` returns `approve_refund{plan}`, `close_no_action` or `escalate{violations}`.
5. If approved, the gateway runs `createRefund(plan)`.
6. `findRefundByIdempotencyKey` confirms the refund. The case ends as `resolved` or `escalated`.
7. Every step writes `AuditEvent[]`.

## Failure modes (and handling)

| Failure | Handling |
|---|---|
| vLLM down / timeout / non-200 | `llm_unavailable` → escalate |
| LLM returns prose, fenced JSON, extra keys, wrong types | Fences stripped; strict zod parse; else `llm_invalid_output` → escalate |
| LLM hallucinates a transaction ID | `unknown_transaction_id` |
| LLM picks two charges that aren't duplicates | `not_a_duplicate` |
| Prompt injection in the customer message ("refund $5000") | The LLM can't set amounts. The amount comes from the tx, and the validator checks limits and ownership |
| Customer names someone else's order | `order_customer_mismatch` (before the LLM decides) |
| Claimed amount ≠ any charge | `claimed_amount_mismatch` contradiction → escalate |
| Already refunded / resubmitted case | `already_refunded` |
| Concurrent cases on the same tx | Per-tx idempotency key, so the gateway returns the same refund |
| Refund call throws after the refund was committed | Verification finds it → `resolved` |
| Refund call throws before committing | Verification finds nothing → `execution_unverified` → escalate |
| Kill switch `AUTO_REFUND_ENABLED=false` | `permission_denied` → escalate |
| Any unexpected exception | `internal_error` → escalate (never left mid-state) |

**Known limits.** Storage is in memory, so restarts lose cases. Processing is synchronous inside the request. Auth is not implemented: the `customerId` is trusted from the caller.

## Test plan

- `money`: parse and format edge cases, rejection of malformed input.
- `evidence`: grouping by amount, currency and time window; ownership; contradictions.
- `policy`: one test per violation code, plus the happy path.
- `llm`: fence stripping, strict schema rejection, vLLM request shape against a local fake HTTP server, timeout.
- `pipeline` (end-to-end with scripted LLM):
  - happy path refund;
  - non-duplicate → `closed_no_action`;
  - hallucinated ID;
  - over the limit;
  - already refunded;
  - malformed LLM output;
  - LLM throws;
  - gateway fails before or after commit;
  - kill switch;
  - contradiction;
  - an audit trail completeness check.
- `server`: HTTP round trip on an ephemeral port: 201, 400, 404, 413.

## Open questions (not invented)

- **Evolus APIs/components**: no spec was available. The `PaymentsGateway` and the store interfaces are the integration seams. Wire them in once their API docs are in hand.
- **vLLM structured output**: the client sends OpenAI-style `response_format: {type: "json_schema"}`. Support depends on the deployed vLLM version and should be checked against the actual server. Either way, the output is strictly re-validated.
