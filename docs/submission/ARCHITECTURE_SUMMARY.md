# Architecture summary

```
customer message (demo store widget or API)
  → ingress guard: demo allowlist or operator token; rate, concurrency and daily model-call budget   [code]
  → AI understanding: intent + stated amounts, strict schema                                        [model, untrusted]
  → evidence: order, charges, refunds, duplicate groups, contradictions                             [code]
  → AI decision proposal: REFUND_DUPLICATE | NO_ACTION | ESCALATE, strict schema                     [model, untrusted]
  → policy authorization: amount from records, thresholds, coherence, cited evidence                [code]
  → revalidation against current state                                                              [code]
  → simulated payment gateway, idempotent                                                           [code]
  → read-back verification → RESOLVED | ESCALATED | CLOSED_NO_ACTION | FAILED                       [code]
  → audit event for every step
```

| Layer | Where | Notes |
|---|---|---|
| Ingress | `apps/api/src/ingress.ts` | Free text needs a server-side token; limits apply before any model call |
| Case engine and state machine | `apps/api/src/case-engine.ts`, `state-machine.ts` | Final states only after verification; every transition audited |
| Policy | `apps/api/src/policy-engine.ts` | Deterministic; revalidates before execution |
| Gateway | `apps/api/src/gateway.ts` | Simulated, idempotent, read-back |
| AI adapters | `apps/api/src/request-understanding.ts`, `model-adapter.ts` | Prompts versioned by SHA-256; customer text only in the user message as JSON |
| Provider client | `apps/api/src/provider/openai-compatible-client.ts` | Timeouts, bounded retries (429/5xx only), request pacing, size limits, redacted errors |
| AI config and startup | `apps/api/src/ai-config.ts`, `ai-mode.ts` | `JARVIS_AI_MODE=vllm` needs a listed model and two passing schema probes, or the process exits; no fixture fallback |
| Web | `apps/web` (React + Vite) | Merchant workspace and demo store; reads `/api/health` for the status chips |
| Hosting | Vercel serverless (`api/*.ts`) for the fixture preview; `npm run api:start` locally for the live model | The AMD key is server-side only and absent from the Vercel project |
| Evaluation | `apps/api/eval`, `data/cases/duplicate-charge-eval.v1.json` (pinned SHA-256) | `api:bench:ci` gates CI at 0 unsafe; `api:bench:vllm` runs the same cases on a real model |
| Proof tooling | `scripts/verify-demo.mjs`, `scripts/tokenfactory-smoke.ps1`, `scripts/live-gate.ps1` | Real-model proof mode fails unless every audited AI call used `vllm:<model>` |

AMD configuration used for the live run: base URL `https://developer.amd.com.cn/radeon/api/v1`, model `DeepSeek-V4-Flash`, `JARVIS_MODEL_STRUCTURED_OUTPUT=json_object`, timeout 30 s, 1 retry, 3.1 s request spacing (gateway limit 20 requests/min).
