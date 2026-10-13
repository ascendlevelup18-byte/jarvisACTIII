# JARVIS Automations: 3-minute judge demo

Everything below is **shown live by the running app against the real backend** (fixture AI, simulated payments, synthetic store) unless marked **FUTURE**. No step is a front-end animation: every outcome is a `POST /cases` response.

## Setup (before recording)

```bash
PORT=3000 npm run api:start      # fixture mode (or JARVIS_AI_MODE=vllm after docs/TOKEN_FACTORY_SETUP.md)
npm run web:dev                  # http://127.0.0.1:43123
```

1. Open `#/settings` → *Clear recorded cases*, so the run starts empty.
2. Complete setup once if asked.
3. Check the header chips read `API ONLINE · FIXTURE AI · PAYMENTS SIMULATED · AMD HW NOT VERIFIED · EVOLUS NOT CONNECTED`. They come from `/api/health`. In vllm mode the AI chip shows `MODEL · <id>`, and that is the only time to say a real model is running.

## Script (3:00)

| Time | Screen | Do | Say |
|---|---|---|---|
| 0:00–0:15 | Dashboard (empty) | Point at the empty state | "JARVIS Automations is a commerce operations workspace. Its live automation resolves duplicate-charge refunds, and AI never gets to move money on its own. Nothing is recorded yet; everything you'll see comes from real backend cases." |
| 0:15–0:45 | Demo store (`Open demo store`) | Order **48291** → *Request a refund* → send | "A customer was charged twice. The request goes to the JARVIS backend. The AI reads it and proposes; deterministic policy approves; the simulated gateway refunds; read-back verification confirms. Only then is the customer told: *Refund of $89.99 issued*." |
| 0:45–1:05 | Demo store | Order **48294** → send | "This message tries to order a $5,000 refund. The AI still proposes a refund, but policy denies it on the evidence. Escalated, $0 moved, and the customer is told a person will review it, *not* that a refund was made." |
| 1:05–1:15 | Demo store | Order **48293** → send | "Already refunded once: JARVIS closes it with no second refund." |
| 1:15–1:45 | Support inbox | Open Dee Placeholder (#48294) | "The centre pane shows only what was recorded: the request and the reply the customer actually saw. The Copilot is internal. These are separate states: PROPOSED is reached; APPROVED, EXECUTED and VERIFIED are not; ESCALATED is. The policy section it cites and the failed check are right here." |
| 1:45–2:05 | Orders → #48291 | Open the order | "Orders join the store with JARVIS's cases: refunded by JARVIS (simulated), verified. Decision history and the audit trail are one click away." *Open case evidence* → proof chain. |
| 2:05–2:30 | Analytics | Click the *Escalated* segment, then *Open evidence* | "Analytics is computed from these cases: outcomes, verified refunds, AI calls from the audit, and pending reviews. Every chart drills into the cases behind it. There are no sales figures, because the data doesn't support them." Optional: toggle *Sample data* and say "clearly labelled illustration, never mixed with real records." |
| 2:30–2:45 | Approvals → Audit trail | Header *pending review* button | "Escalations land in a review-only queue: JARVIS can't approve them on its own. The audit trail filters every engine event: AI call, policy evaluation, gateway, read-back." |
| 2:45–3:00 | Proof Mode → *Run vs Adversarial message*, then the Analytics benchmark section | | "Same AI, same proposal, opposite outcomes, decided by code. On our pinned 30-case adversarial benchmark: zero unsafe autonomous actions, 20 of 20 correct escalations. That's the fixture model; AMD real-model results follow the runbook." |

## Demonstrated vs future

| Capability | Status |
|---|---|
| Ingress guard, policy gate, simulated execution, read-back verification, audit trail, escalation | **Demonstrated** (fixture AI) |
| Merchant workspace: Dashboard, Orders, Customers, Support inbox + Copilot, Analytics (with drill-down), Approvals (review-only), Audit trail | **Demonstrated** from recorded cases |
| Failed verification is never shown as resolved | **Demonstrated** in tests (`apps/web/test/*.test.ts`, benchmark DC-E05). The demo UI has no fault-injection button |
| Real open model via AMD Token Factory or vLLM on AMD GPUs | **FUTURE.** Code ready; run `scripts/tokenfactory-smoke.ps1` and `docs/TOKEN_FACTORY_SETUP.md`; show only after `docs/AMD_EVIDENCE.md` holds a real run |
| Approving an escalation from the UI; free-text chat in public; real store connection | **Not available** (labelled in the UI) |
| Evolus integration | **FUTURE.** Not integrated (`docs/EVOLUS_INTEGRATION.md`) |
| Real payments | Not planned for the demo. The gateway is simulated |

## Do not say

- "Running on AMD", unless the AI chip shows a real model **and** `docs/AMD_EVIDENCE.md` records the run.
- "Connected to Evolus".
- "Real refunds" or "revenue".
- Sample analytics as if they were results.
- Any time or cost saving as a measured result.

Storyboard with screenshots: `docs/STORYBOARD.md`. Business framing: `docs/BUSINESS_EVIDENCE.md`.
