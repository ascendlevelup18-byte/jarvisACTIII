# Submission form text (ready to paste)

Updated 15 Oct 2026 to reflect the live AMD run. It supersedes the AMD status lines in `docs/SUBMISSION.md`, which still say "not yet run".

## Project title

JARVIS Automations: AI proposes, policy decides, every refund is verified

## Short description (≈ 280 characters)

JARVIS resolves duplicate-charge complaints for online merchants. An open model on AMD-hosted inference reads each case and proposes a fix; deterministic policy code decides whether money may move; every refund is verified by read-back and audited. Unsafe or contradictory cases escalate.

## Long description

**Problem.** Support and payments teams handle a steady stream of "I was charged twice" tickets by hand. The work is repetitive and rule-shaped, but mistakes move real money: refunding the wrong charge, refunding twice, or trusting the amount a customer typed. A plain LLM agent that holds the refund tool can be talked into all three.

**Intended users.** Support and payments-operations teams at online merchants and marketplaces.

**What JARVIS does.** JARVIS splits the work along a trust boundary. The model (DeepSeek-V4-Flash, served by AMD's hosted inference API) classifies the request, extracts the amounts the customer states, and proposes a structured decision: refund a specific duplicate charge, take no action, or escalate. Its output must match a strict schema or the case fails closed. Deterministic code owns everything with authority: the refund amount comes from the system of record; policy thresholds, transaction coherence and cited evidence are checked; state is revalidated right before execution; the (simulated) payment gateway is called idempotently; and the result is verified by reading it back. A case is RESOLVED only after verification. Contradictions, prompt-injection attempts, already-refunded orders and out-of-scope requests end in ESCALATED or CLOSED_NO_ACTION with the failed checks recorded for a person.

**Product.** A merchant workspace (dashboard, orders, customers, support inbox with an internal Copilot, analytics computed from recorded cases, a review-only approvals queue, a filterable audit trail and a Proof Mode) plus a customer-facing demo store whose support widget sends real cases to the backend.

**AMD.** One OpenAI-compatible adapter. On 14 Oct 2026 JARVIS ran end to end on AMD-hosted DeepSeek-V4-Flash: startup schema probes passed, the three demo orders ran with every audited AI call on `vllm:DeepSeek-V4-Flash` (17/17 real-model checks), and the full pinned 30-case adversarial benchmark completed with **0 unsafe autonomous actions**, 20/20 correct escalations and 26/30 with the exact expected outcome (27/30 = 90.0% safe resolution; all 4 misses failed safe). Evidence files are in the repository. The same adapter targets self-hosted vLLM on AMD GPUs, which is not yet deployed.

**Honest limits.** Payments are simulated and store data is synthetic. The public demo runs a deterministic fixture model so no key is deployed. One automation (duplicate-charge refunds) is live; other modules are marked previews. No business-impact figures were measured.

## Technology tags

AMD · AMD Token Factory (hosted inference) · DeepSeek-V4-Flash · OpenAI-compatible API · TypeScript · Node.js · React · Vite · Zod · structured output · deterministic policy engine · Vercel

## Links

- Repository: https://github.com/ascendlevelup18-byte/jarvisACTIII/tree/claude/kickoff-day1-jkg6ry (the default branch `master` is the pre-hackathon baseline; link the branch or change the default)
- Demo URL: https://jarvis-actiii-preview.vercel.app/#/command-center (public, fixture AI, simulated payments)
- Video: `JARVIS-ACTIII-FINAL-DEMO.mp4` (3:30, uploaded with the form; not in the repo)
- Slides: `docs/submission/deck/jarvis-deck.pdf`
- Cover image: `docs/submission/cover.png`
