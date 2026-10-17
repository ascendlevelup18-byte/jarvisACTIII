# Judge walkthrough (about three minutes)

Open `https://jarvis-actiii-preview.vercel.app/#/judge` (after the Judge Mode deploy; until then, `#/command-center`).

1. **The problem.** "I was charged twice" tickets are routine but they move money. Support teams handle them by hand across three tools.
2. **Why plain LLM automation is dangerous.** A model holding the refund tool can be talked into refunding the wrong charge, refunding twice, or paying the amount the customer typed. With JARVIS's policy layer removed, the same proposals on our 30 adversarial cases give 18 unsafe outcomes, including 11 refunds the cases do not authorize (offline, naive fixture proposer; `docs/improvement/BASELINE_EXPERIMENT.md`).
3. **Proposal versus authority.** Judge Mode section 2: the model touches two steps, understanding and proposing, and has no authority in either. Code derives the amount from records, checks policy and permissions, revalidates, executes idempotently and reads the refund back.
4. **A verified simulated refund.** Section 1, "Run all four". Order #48291: $89.99 simulated refund, policy APPROVE, read-back verified. "Inspect why" shows the checks and the proof chain.
5. **A blocked adversarial request.** Order #48294 demands $5,000 and tries to override policy. Policy DENY, escalated, $0, zero gateway calls.
6. **No repeated refund.** Order #48293 was already refunded: closed with no action. Replays and racing duplicate submissions never create a second refund (`financial-action-safety.test.ts`).
7. **AMD, inspectable.** Section 4 replays the 14 Oct run on AMD-hosted DeepSeek-V4-Flash, labelled recorded, not live: the same three outcomes, per-call latency, 17/17 checks, and the 30-case benchmark (0 unsafe, 20/20 escalations, 26/30 exact). Section 5 links every evidence file.
8. **Commercial potential and limits.** Buyer: support and payments ops at mid-size merchants. Value model, pricing and a 30-day shadow-mode pilot in `docs/improvement/BUSINESS_CASE.md`. Limits: payments simulated, data synthetic, one automation live, no customers yet.
