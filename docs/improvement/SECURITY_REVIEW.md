# Focused security review (16 Oct 2026)

Scope: branch `improve/actiii-judge-experience` at its current head, public demo surface, money path. Method: source reading, the existing and new tests, dependency audit, secret scans. This is a bounded review, not a penetration test.

## Checks run

| Check | Result |
|---|---|
| `npm audit` (root and `apps/web`) | 0 vulnerabilities in both lockfiles |
| Secret patterns in the tracked tree (AMD key format, `sk-`, `ghp_`, private keys, JWTs) | 0 |
| Secret patterns and env-var names in the built web bundle | 0; no source maps shipped |
| History scan (75 commits, every ref, 16 Oct) | 0 key-shaped strings |
| API tests | 307/307, including 16 new money-path tests (`financial-action-safety.test.ts`, `baseline-no-policy.test.ts`) |
| Pinned benchmark gate | 0 unsafe autonomous actions; `data/` and `evals/` unchanged |

## Findings

| Id | Severity | Finding | Exploitability | Remediation | Status |
|---|---|---|---|---|---|
| F-1 | Low | Concurrent identical cases on one order share the record-derived idempotency key (`jarvis-dup-refund:<order>`). Only one refund is created, but **every racing case reports RESOLVED** for that one refund (5 racing cases, 5 RESOLVED, 1 refund). Money is safe; case counts and dashboards overstate resolutions. | Needs two submissions for the same order inside one execution window on one long-running server. The public serverless demo gives each request a fresh world, so it cannot occur there. | Have the gateway report whether `refund()` created or replayed a refund, and let only the creating case resolve; a replay closes as "already refunded by case X". This changes the engine's execution step, so it waits for owner approval. | Open, documented and covered by a test that pins the money invariant |
| F-2 | Low | The serverless wrapper reads the whole request body before the shared 64 KiB ingress check (also noted by the post-submission audit branch). | Memory pressure on one function instance; the Vercel platform limits body size independently. | Bounded streaming read before parsing. | Open |
| F-3 | Info | Rate, concurrency and model-call budgets are in-memory, so they are per instance on serverless and reset on restart. Already documented in the README. | Only matters if paid inference is enabled on serverless, which the public demo does not do. | Shared store (e.g. Redis) before any public live-model mode. | Accepted for the fixture demo |
| F-4 | Info | One shared operator bearer token for free text; no per-user identity or rotation. Documented. | The token is not deployed on the public demo. | Per-user auth before real merchants. | Accepted for the demo |
| C-1 | **High (operational)** | The AMD key was exposed once in local PowerShell history on 14 Oct (line removed 15 Oct) and **has not been rotated**. It was never committed or deployed. | Anyone with access to the owner's PC or its backups from that window. | Treat as compromised. Do not reuse it. Rotate through the AMD dashboard or the organizers; use a new key for any further paid run. | Open, owner action |

## Verified invariants (by test)

- Policy never authorizes an amount from the customer's text or the model; the amount comes from records (`policy-engine.test.ts`, `engine-hardening.test.ts`).
- A case is RESOLVED only with a verified read-back that matches charge, amount and currency; mismatched, missing, non-succeeded or throwing read-backs never resolve (`financial-action-safety.test.ts`, `engine-hardening.test.ts`, `safety-invariants.test.ts`).
- Retries and concurrent cases never create a second refund for the same duplicate (`financial-action-safety.test.ts`, `review-remediation.test.ts`, `engine-hardening.test.ts`).
- Adversarial, contradicted and already-refunded requests make zero gateway calls (`financial-action-safety.test.ts`).
- Malformed or extra-authority model output fails closed (`engine-hardening.test.ts`).
- A provider that reports a different model than requested fails closed (`engine-hardening.test.ts`).
- Free text without the server-side token is refused before any model call: 401 locally, 403 on Vercel (`ingress*.test.ts`, live `demo:verify`).
