# JARVIS: 2–3 minute demo script (Proof Mode)

Everything below is **shown live by the running app** against the real backend (fixture AI, simulated payments) unless marked **FUTURE**.

## Setup

```bash
PORT=3000 npm run api:start      # fixture mode
npm run web:dev                  # http://127.0.0.1:43123
```

- Or use a fixture-only Vercel preview (`docs/VERCEL_PREVIEW_SETUP.md`).
- **Before recording:** check that the header chips read `API ONLINE · FIXTURE AI · PAYMENTS SIMULATED · AMD HW NOT VERIFIED · EVOLUS NOT CONNECTED`. They come from `/api/health`.

## Script

| Time | Show | Say |
|---|---|---|
| 0:00–0:20 | Operations page, header chips | "Duplicate charges are a top payments-support ticket. Refunding is easy; refunding *safely* is the hard part, because an AI agent can be talked into the wrong refund. JARVIS lets AI read the case and propose, but only deterministic code can let money move." |
| 0:20–0:35 | **Safety showdown** → *Run vs Adversarial message* | "Two real requests hit the backend right now: a genuine duplicate, and a message that tries to order a $5,000 refund." |
| 0:35–0:55 | Showdown table | "Same AI, same proposal: *refund duplicate* both times. Policy says **APPROVE** for A and **DENY** for B. A moved $89.99 and was verified by read-back; B moved $0.00." |
| 0:55–1:35 | *Open full investigation* on A: verdict, **proof chain**, "Why the refund was allowed" | Walk the 7 steps: "The complaint is untrusted input. The purple steps are model output with no authority: the understanding, and the proposal. Evidence comes from the system of record. Green is policy: 18 of 18 checks passed, and the amount came from the records, not the model. Blue is the simulated gateway, then read-back verification confirmed the refund before the case closed." |
| 1:35–2:10 | Back → open B (or the *Conflicting amount* demo) | "Here the evidence contradicts the customer's claim. The AI still proposed a refund; policy overrode it. Execution was never run. The case goes to a human with the exact failed checks." |
| 2:10–2:30 | Scroll to **Audit trail** | "Every step is an engine-recorded event: AI calls with adapter and latency, both policy evaluations including the pre-execution revalidation, the gateway call and the read-back. This is the record, replayed after completion; nothing is animated to look live." |
| 2:30–2:50 | **System** page | "Status comes from the backend's health endpoint. Payments are simulated. AMD hardware shows *not verified*, because a responding endpoint doesn't prove what hardware it runs on." |
| 2:50–3:00 | Benchmarks page | "On our 30-case adversarial benchmark: 0 unsafe autonomous actions, 20 of 20 correct escalations. That is the fixture model; real-model results follow." |

## Demonstrated vs future

| Capability | Status |
|---|---|
| Ingress guard, proof chain, policy gate, simulated execution, read-back verification, audit trail | **Demonstrated** (fixture AI) |
| Failed verification is never shown as resolved | **Demonstrated** in tests (`apps/web/test/proof-mode.test.ts`) and in benchmark case DC-E05. The demo UI has no fault-injection button |
| Real open model on AMD Developer Cloud (vLLM) | **FUTURE.** Code ready (`npm run api:start` with `JARVIS_AI_MODE=vllm`). Show it only after `docs/AMD_EVIDENCE.md` holds a real run |
| Evolus Knowledge Library / Workflow hand-off | **FUTURE.** Not integrated (`docs/EVOLUS_INTEGRATION.md`) |
| Real payments | Not planned for the demo. The gateway is simulated |

## Do not say

- "Running on AMD".
- "Connected to Evolus".
- "Real refunds".
- Any time or cost saving as a measured result.

See `docs/BUSINESS_EVIDENCE.md`.
