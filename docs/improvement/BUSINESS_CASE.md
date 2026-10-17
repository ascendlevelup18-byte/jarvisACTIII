# Business case: one narrow, verifiable automation

**Rule for this page.** Section 1 is measured. Everything after it is a **hypothesis** with stated assumptions. JARVIS has no customers, revenue, pilots or measured merchant savings, and claims none.

## 1. Measured (synthetic benchmark, not production)

| Fact | Value | Source |
|---|---|---|
| Unsafe autonomous actions, live AMD model, 30 adversarial cases | 0 | `evals/results/duplicate-charge-eval.v1.vllm-deepseek-v4-flash-tf-1.json` |
| Same proposals with the policy layer removed (fixture proposer) | 18 unsafe outcomes, 11 unauthorized refunds | `evals/results/baseline-no-policy.fixture.json` |
| Required escalations made, live model | 20/20 | same tf-1 file |
| Autonomous cases resolved, live model | 7/10 (3 conservative escalations) | same |
| Median model time per case, live | ≈ 11 s (2.0 s + 8.9 s) | same, `telemetry.latencyMs` |

## 2. The buyer and the problem

**Buyer:** the head of support operations or payments operations at a mid-size online merchant or marketplace, typically 2,000–50,000 orders a month on Shopify, BigCommerce or a custom stack with Stripe or Adyen.

**Pain (hypotheses to validate in interviews):**
- "I was charged twice" tickets are repetitive but touch money, so they cannot be handed to a generic chatbot.
- Agents switch between the helpdesk, the order system and the payment dashboard to confirm each duplicate.
- Mistakes are costly in both directions: refunding the wrong charge or twice loses money; slow refunds turn into chargeback disputes and fees.
- Prompt-injected or inflated refund requests ("refund $5,000") are a new fraud vector once AI agents hold refund tools.

**Today's workflow:** ticket → agent finds the order → opens the payment dashboard → compares charges → decides → issues a refund → replies → (sometimes) notes it. No independent verification step.

**With JARVIS:** ticket → JARVIS gathers order, charges and refunds → model proposes → policy authorizes from records → refund executes idempotently → read-back verifies → customer reply drafted → anything unclear goes to a person with the evidence and the failed checks already assembled.

## 3. Value model (editable assumptions)

Hours saved per month = `cases × A × T / 60`

| Symbol | Meaning | Default | Status |
|---|---|---|---|
| `cases` | Duplicate-charge tickets per month | 400 | Assumption; ask the merchant |
| `A` | Share JARVIS closes with no human | 30% | Benchmark rate on an adversarial set; real traffic is likely more benign, but unmeasured |
| `T` | Agent minutes per case today | 8 | Assumption; time it in a pilot |
| `C` | Loaded agent cost per hour | $35 | Assumption |

Example with the defaults: 400 × 0.30 × 8 / 60 = **16 hours/month ≈ $560/month** in handling time. Escalated cases also arrive with evidence assembled, which probably saves time too; that is **not** counted.

| Cases/month | A = 30% | A = 50% |
|---|---|---|
| 400, T = 8 min | 16 h · $560 | 27 h · $933 |
| 2,000, T = 8 min | 80 h · $2,800 | 133 h · $4,667 |

**Error-prevention value** (not in the table): each prevented wrong or double refund saves the refunded amount plus handling and possible dispute fees. JARVIS's measured safety profile (0 unsafe of 30; 18 unsafe outcomes without the policy layer on the naive proposer) supports the claim that it prevents this class of error. The real frequency of such errors at a merchant is unknown.

## 4. Pricing hypothesis

Usage-based, aligned with the work: **$0.50 per resolved case** (verified refund or verified no-action) plus **$0.10 per escalation** delivered with an evidence pack, with a monthly minimum (e.g. $99). At 400 cases/month with A = 30%: 120 × $0.50 + 280 × $0.10 = $88, so the minimum applies, against an estimated ≥ $560 of handling time. Model cost per case is small next to that (two calls on a hosted model) but unmeasured; the 14 Oct run did not record spend.

## 5. Pilot plan (30 days, one merchant)

1. **Week 1, shadow mode:** JARVIS reads tickets and payment records (read-only API keys), proposes, and logs what it would do. No refunds.
2. **Week 2, compare:** agents' actual decisions versus JARVIS's proposals and policy outcomes; measure `T`, `A`, disagreements and would-be unsafe actions.
3. **Weeks 3–4, assisted:** JARVIS executes refunds below a low limit (e.g. ≤ $50) through the provider's sandbox first, then production with per-refund human confirmation; read-back on every refund.
4. **Exit criteria:** 0 unsafe actions, measured `T` and `A`, agent satisfaction, and a go/no-go on autonomous execution under the merchant's own limits.

## 6. What a real deployment needs (not built)

- Connectors: helpdesk (Zendesk/Gorgias), commerce platform, payment provider refunds API and webhooks.
- Identity and permissions per agent and per merchant; audited approval of escalations (today the review queue is read-only).
- Durable, shared idempotency and audit storage across workers; fix F-1 (`SECURITY_REVIEW.md`).
- PCI-aware data handling (JARVIS needs charge ids and amounts, never card numbers), data retention and regional hosting.
- Provider-specific refund semantics (partial refunds, pending states, currency conversion).

## 7. Go-to-market (first 10 merchants)

Start where duplicate charges are common and refunds are rule-shaped: subscription boxes and DTC brands on Shopify + Stripe. Channel: a Shopify app listing plus direct outreach to support-ops leads, offering the free 30-day shadow-mode pilot above. The proof asset is the same one judges see: the three outcomes, the no-policy comparison and the audit trail.
