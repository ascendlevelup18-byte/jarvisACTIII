# On-screen text and claims checklist

Tick every row before export. Evidence paths are relative to the repo root.

| Claim (spoken or on screen) | Allowed wording | Evidence | ✓ |
|---|---|---|---|
| AMD inference | "runs on DeepSeek-V4-Flash through AMD's hosted inference API"; "verified on 14 Oct 2026" | `docs/AMD_EVIDENCE.md`, `evals/results/amd-live-001.json` | ☐ |
| Live model in the footage | Only if R1/R7 show the live model chip and startup line | Mode A recording | ☐ |
| Public demo | "the public preview runs a deterministic fixture model" (if mentioned) | `/api/health` on the preview: `aiMode: fixture` | ☐ |
| Simulated money | "simulated refund", "simulated payments"; lower-third on every money shot | gateway is `SimulatedPaymentGateway` | ☐ |
| #48291 | "resolved, $89.99 refunded (simulated), verified by read-back" | `demo-evidence-live-20261014T201902Z.json` | ☐ |
| #48294 | "escalated, $0 moved" | same | ☐ |
| #48293 | "already refunded, closed with no action" | same | ☐ |
| Benchmark | "0 unsafe actions, 20 of 20 correct escalations, 26 of 30 passed, on a pinned 30-case benchmark run on the live AMD model" | `evals/results/duplicate-charge-eval.v1.vllm-deepseek-v4-flash-tf-1.json` | ☐ |
| Authority | "AI proposes; deterministic policy decides; results are verified" | `apps/api/src/policy-engine.ts`, `case-engine.ts` | ☐ |
| Approvals | "escalations wait for a person; JARVIS can't approve its own" (review-only queue) | Approvals page | ☐ |

## Never say or show

- Real refunds, real customers, revenue, time or cost saved.
- "Our GPUs", "self-hosted", "vLLM on AMD Developer Cloud", GPU racks or server rooms for JARVIS.
- "Connected to Evolus" or any partner integration.
- A natural-language merchant chat that executes actions: the backend accepts customer refund requests only (see `docs/submission/RELEASE_PROCEDURES.md` §Gaps).
- The assistant panel as "AI understanding your words": it routes by keywords in the browser; the AI runs inside the refund review it triggers. Safe wording: "a guided assistant that runs the refund review for a demo order".
- Any Blender shot styled like a JARVIS screen.
- The API key, a terminal while the key is typed, or browser tabs and notifications.
