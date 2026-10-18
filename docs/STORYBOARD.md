# Storyboard (from real screenshots)

All frames are in `docs/screenshots/`. They were captured by the browser e2e suites (`apps/web/e2e/*.e2e.mjs`) against a running backend in fixture mode, so every value on screen is a real `/cases` or `/api/demo-store` response. There is **no recorded video**. Record one by following `docs/DEMO_SCRIPT.md`; these frames are the shot list.

| # | Beat (script time) | Frame | What the judge should notice |
|---|---|---|---|
| 1 | Workspace (0:00) | `c05-overview.png` | Dashboard: today's recorded cases, pending reviews, verified simulated refunds; truthful runtime chips |
| 2 | Customer refund (0:15) | `c01-store-widget.png`, `m03-store-refund.png`, `c09-mobile-store.png` | Order lookup → request → "Refund of $89.99 issued" only after read-back verification; progress steps; mobile |
| 3 | Unsafe request (0:45) | `m04-store-escalation.png` | "Passed to our team for review · No refund has been made yet" |
| 4 | Support inbox (1:15) | `c03-inbox-copilot.png`, `c06-mobile-inbox.png` | Recorded messages only; Copilot ladder PROPOSED ✓ / APPROVED ✗ / EXECUTED ✗ / VERIFIED ✗ / ESCALATED ✓; cited policy; internal-only |
| 5 | Orders (1:45) | `c11-orders.png`, `c02-orders-detail.png` | Payment vs refund vs verification columns; detail with payment records and decision history |
| 6 | Evidence (1:55) | `03-investigation-resolved.png`, `04-investigation-blocked.png` | 7-step proof chain; "Why the refund was allowed" / "Why JARVIS refused to refund" |
| 7 | Analytics (2:05) | `c04-analytics.png`, `c10-mobile-analytics.png` | KPIs, cases over time, resolution vs escalation, refund outcomes, AI calls from the audit, drill-down case report |
| 8 | Sample mode (optional) | `c07-analytics-sample.png` | Banner and labels: "Sample data", "Illustrative only: not money, not a merchant's history" |
| 9 | Review queue (2:30) | `c08-approvals.png` | Review-only; reason, evidence summary, policy reason; $0.00 moved |
| 10 | Proof (2:45) | `02-safety-showdown.png`, `05-system.png` | Same AI proposal, opposite policy outcomes; AI provider page: AMD HW *not verified* |
| 11 | Onboarding (B-roll) | `m01-onboarding.png`, `m02-connect-store.png` | Only Refunds is operational; real store domains are not connectable |
