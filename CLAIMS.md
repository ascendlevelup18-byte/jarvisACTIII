# Claims and their evidence

Every claim JARVIS makes in its README, deck, video and Judge Mode, with the file or command that proves it. Labels: **Measured** (a committed result file), **Tested** (a test in this repository), **Observed** (a recorded check of a running system), **Design** (true by construction in code you can read).

| Claim | Type | Evidence | Reproduce |
|---|---|---|---|
| On 14 Oct 2026 JARVIS ran on AMD-hosted DeepSeek-V4-Flash | Measured | `evals/results/amd-live-001.json`, `live-gate-20261014T201902Z.json` | `scripts/live-gate.ps1` (needs a key; paid) |
| 17/17 live-model demo checks | Measured | `evals/results/demo-evidence-live-20261014T201902Z.json` | same |
| 30 pinned adversarial cases, 0 unsafe autonomous actions (live model) | Measured | `evals/results/duplicate-charge-eval.v1.vllm-deepseek-v4-flash-tf-1.json` → `metrics` | `npm run api:bench:vllm -- --run <id>` (paid) |
| 20/20 required escalations (live model) | Measured | same → `correctEscalations` | same |
| 26/30 exact expected outcomes (live model) | Measured | same → `passed`. DC-E02 and DC-E03 use scripted decision output | same |
| 29/30 exact outcomes, 0 unsafe (fixture model, every CI run) | Measured | `evals/results/duplicate-charge-eval.v1.json`; `.github/workflows/ci.yml` | `npm run api:bench:ci` |
| Without the policy layer, the same proposals give 18 unsafe outcomes and 11 unauthorized refunds (fixture proposer) | Measured | `evals/results/baseline-no-policy.fixture.json`; `docs/improvement/BASELINE_EXPERIMENT.md` | `npm run api:baseline` |
| The model never sets the refund amount; it comes from payment records | Design + Tested | `apps/api/src/policy-engine.ts`; `engine-hardening.test.ts` | `npm run api:test` |
| Nothing is RESOLVED without a matching read-back | Tested | `safety-invariants.test.ts`, `financial-action-safety.test.ts` | `npm run api:test` |
| Retries and concurrent cases cannot refund twice | Tested | `financial-action-safety.test.ts`, `review-remediation.test.ts`, `engine-hardening.test.ts` | `npm run api:test` |
| Unsafe requests make zero gateway calls | Tested | `financial-action-safety.test.ts` | `npm run api:test` |
| A provider that swaps the model fails closed | Tested | `engine-hardening.test.ts` | `npm run api:test` |
| The public demo uses fixture AI, synthetic data and simulated payments, and refuses free text | Observed | `GET https://jarvis-actiii-preview.vercel.app/api/health`; `evals/results/hero-evidence-vercel-prod-20261016.json` | `npm run demo:verify -- https://jarvis-actiii-preview.vercel.app` |
| Judge Mode shows the recorded AMD run exactly as recorded | Tested | `apps/web/test/recorded-amd-run.test.ts` compares every displayed value with the evidence files | `npm run web:test` |
| No real money moves anywhere | Design | `apps/api/src/gateway.ts` (`SimulatedPaymentGateway`); no payment credentials exist in the code or deployment | — |

## Claims JARVIS does not make

- Self-hosted AMD GPUs, ROCm or vLLM in any run (`docs/improvement/AMD_PROVENANCE.md`).
- That the hosted endpoint is confirmed to be the Token Factory portal.
- Gemma end to end, or Google prize eligibility.
- Production statistics, customers, revenue, or measured merchant savings (`docs/improvement/BUSINESS_CASE.md` §1 vs §3).
- Real-model results for the no-policy baseline (prepared, not run).
