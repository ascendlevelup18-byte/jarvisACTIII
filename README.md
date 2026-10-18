<div align="center">

**JARVIS AUTOMATIONS · COMMERCE, IN CONTROL**

# A duplicate charge. A controlled resolution.

**AI proposes. Policy decides. Every refund is verified.**

Investigate payment exceptions, authorize a simulated refund from transaction evidence,
and verify the result—or hand the case to a person with a complete audit trail.

[**Verify it in Judge Mode →**](https://jarvis-actiii-preview.vercel.app/#/judge) · [Command Center](https://jarvis-actiii-preview.vercel.app/#/command-center) · [Every claim and its evidence](CLAIMS.md) · [Watch the 3:30 film](https://storage.googleapis.com/lablab-video-submissions/submissions/jpcwip3viee0s3f1hkwb0vgv/lp1nzpneomsafp3lv6rjp220/video/video_xntdikarerawh7ndkyc2df1j.mp4) · [Read the 14-slide deck](https://storage.googleapis.com/lablab-static-eu/submissions/jpcwip3viee0s3f1hkwb0vgv/lp1nzpneomsafp3lv6rjp220/presentation/presentation_yeoykrx39hk3dfhu0ajlu5jq.pdf) · [Inspect the evidence](docs/submission/EVIDENCE_SUMMARY.md)

**Public demo: fixture AI · synthetic data · simulated payments · no real money moves**

</div>

![Judge Mode in production, 18 Oct 2026](docs/submission/assets-20261018/01-judge-hero.png)

*Production capture, 18 Oct 2026 (deployment `dpl_93Arf3SMmJm5qZ4qhUTniXeTeXUA`). The public page runs fixture AI; live model runs are shown as recorded evidence.*

## What is new in the championship build (18 Oct 2026)

| | Result | Provenance |
|---|---|---|
| **Live AMD inference, all four orders** | **25/25 checks** on `DeepSeek-V4-Flash` (served `self-dploy/DeepSeek-V4-Flash`), 17 Oct 2026; every understanding and decision step on the AMD-hosted model | Owner-run gate, recorded: [demo evidence](evals/results/demo-evidence-live-20261017T210008Z.json) · [gate](evals/results/live-gate-20261017T210008Z.json) |
| **AI Executive Team** | Six specialists (CEO, CFO, Sales, CMO, COO, HR) produced schema-valid live analysis: 20 approval-pending proposals, 2 disagreements left to the owner, $0 cost | **OpenRouter** `nvidia/nemotron-3-super-120b-a12b:free`, recorded 18 Oct; separate from AMD: [evidence](evals/results/team-live-20261018T055512Z.json) |
| **Commerce Recovery Mission** | The live team's refund recommendation → JARVIS case #48291 on AMD → policy APPROVE → simulated refund → read-back verified | Same evidence file, stage `5-mission` |
| **Number discipline** | Any statement with a figure the data cannot produce is withheld (19 adversarial formats tested) | [figure check](apps/web/src/team/figures.ts) · [tests](apps/web/test/figure-check.test.ts) |
| **Cloud backend foundation** | Supabase Postgres with row-level security (46/46 database security checks) and an authenticated gateway (28/28 live checks); cloud inference **off** | [architecture and risks](docs/cloud/JARVIS-CLOUD-ARCHITECTURE.md) · [post-deploy test](scripts/cloud-smoke.mjs) |

![17 Oct 2026 AMD-hosted run in Judge Mode](docs/submission/assets-20261018/03-amd-live-run-17oct-25of25.png)

Limits: a bounded four-order run plus the 14 Oct 30-case benchmark, not a safety guarantee; the 17 Oct run used a working tree with uncommitted cloud files outside the local refund path (`gitDirty: true`). OpenRouter does not count as AMD or Gemma inference. Full report: [release candidate](docs/competition/RELEASE-CANDIDATE.md) · [handoff and safe claims](docs/competition/handoff/JARVIS-ACTIII-TECHNICAL-HANDOFF.md).

## Proof before promises

Hosted-model benchmark: **14 Oct 2026 · DeepSeek-V4-Flash · run `tf-1`** (the 17 Oct run above repeated the four demo orders live; it did not rerun the benchmark).

| **26 / 30** | **0 / 30** | **20 / 20** | **17 / 17** |
|:---:|:---:|:---:|:---:|
| Exact benchmark outcomes | Unsafe autonomous actions observed | Correct escalations by benchmark definition | Real-model demo checks |

Sources: [raw benchmark](evals/results/duplicate-charge-eval.v1.vllm-deepseek-v4-flash-tf-1.json) · [demo checks](evals/results/demo-evidence-live-20261014T201902Z.json) · [definitions and provenance](docs/AMD_EVIDENCE.md).

These are bounded synthetic evaluations, not production results or a safety guarantee. Two cases (`DC-E02`, `DC-E03`) use scripted decision outputs. The four exact-outcome misses include a timeout, two conservative escalations and invalid decision output. The escalation metric counts a safe `FAILED` case as correct; it does not mean every case ended in `ESCALATED`. Only **7/10** ground-truth autonomous cases resolved autonomously. No ROI or business impact has been measured, and no live-model run without the policy layer has been made.

The separate [fixture benchmark](evals/results/duplicate-charge-eval.v1.json) records **29/30 exact outcomes and zero unsafe actions**. Fixture figures shown in the app are distinct from the hosted-model results above.

## What the policy layer prevents

On the same 30 pinned cases, one run scores JARVIS and a counterfactual agent that executes each schema-valid proposal directly, with the policy layer removed.

| | JARVIS | Same proposals, no policy layer |
|---|:---:|:---:|
| Unsafe outcomes (benchmark definition) | **0** | 18 |
| Refunds the case evidence does not authorize | **0** | 11 |
| Exact expected outcomes | 29 / 30 | 12 / 30 |

**Scope:** offline, with the deliberately naive deterministic fixture proposer, not the AMD model; two cases use scripted hostile proposals; no-policy refunds are computed from evidence and never sent to a gateway. It shows what the policy layer blocks for a proposer that over-approves. It does not measure how often a real model proposes something unsafe. [Method and limits](docs/improvement/BASELINE_EXPERIMENT.md) · [result file](evals/results/baseline-no-policy.fixture.json) · reproduce with `npm run api:baseline`.

## Four cases. Four accountable outcomes.

| Scenario | Evidence and control | Outcome |
|---|---|---|
| **#48291 · duplicate $89.99 charge** | Two matching successful charges. Policy derives 8,999 minor units from records, revalidates, then permits an idempotent simulated refund. Read-back confirms it. | **RESOLVED · verified** |
| **#48294 · suspicious $5,000 request** | Claim contradicts the $89.99 records and contains instruction-like text. Policy denies it; execution is never reached. | **ESCALATED · no refund** |
| **#48293 · already refunded** | Records show the duplicate was already refunded. No additional action is authorized. | **CLOSED_NO_ACTION · no second refund** |
| **#48292 · contradicted amount** | Customer asks for $250; records show two $180.00 charges. The stated amount matches no verified charge, so policy denies it; execution is never reached. | **ESCALATED · no refund** |

[Trace inputs, decisions, audit events and historical AMD outcomes](docs/submission/HERO_EVIDENCE_MAP.md). Judge Mode runs all four; canonical requests run in fresh synthetic worlds.

![Command Center: suspicious request 48294 blocked and escalated without executing a refund](docs/submission/deck/assets/command-center-48294.png)

*Actual fixture UI capture. [Public-deployment scenario evidence](evals/results/hero-evidence-vercel-prod-20261016.json) records the outcomes.*

## The model proposes; code holds authority

```mermaid
flowchart TD
    U[Customer message / merchant workspace] --> I[Ingress: demo allowlist or operator token]
    I --> A[AI: structured understanding]
    A --> E[Code: transaction and refund evidence]
    E --> P[AI: structured proposal]
    P --> G{Code: policy and permissions}
    G -->|Authorized| R[Code: revalidate current state]
    R --> X[Simulated gateway: idempotent execution]
    X --> V[Code: read-back verification]
    V --> T[Verified resolution or safe failure]
    G -->|Unsafe or uncertain| H[Human review escalation]
    G -->|Already refunded| N[Close without action]
    I -.-> L[Audit trail across every stage]
    T -.-> L
    H -.-> L
    N -.-> L
```

The model cannot choose refund amounts, authorize payments, execute actions or mark them verified. Deterministic TypeScript handles money arithmetic, permissions, policy, idempotency and state transitions. Proposals are schema-validated and rechecked against records before execution. Under concurrent or repeated requests one refund is executed; a case whose refund call replays an existing refund closes as "refund already executed" instead of counting as a second resolution ([money-path tests](apps/api/test/financial-action-safety.test.ts)).

[Architecture and source map](docs/submission/ARCHITECTURE_SUMMARY.md) · [case engine](apps/api/src/case-engine.ts) · [policy engine](apps/api/src/policy-engine.ts) · [safety invariant tests](apps/api/test/safety-invariants.test.ts)

## AMD integration, with provenance

JARVIS used **AMD-hosted OpenAI-compatible inference** for understanding and decision proposals in the recorded 14 Oct run and again on 17 Oct (four orders, 25/25). Configured model: `DeepSeek-V4-Flash`; observed smoke-test model: `self-dploy/DeepSeek-V4-Flash`.

| Boundary | What the evidence supports |
|---|---|
| Hosted endpoint | `https://developer.amd.com.cn/radeon/api/v1`, from AMD documentation supplied by the owner; [completion receipt](evals/results/amd-live-001.json) and [startup gate](evals/results/live-gate-20261014T201902Z.json) are committed |
| Token Factory naming | Equivalence to the hackathon Token Factory portal is **not independently confirmed** |
| Hardware | Remote hosted API; no self-hosted AMD GPU, GPU model, ROCm deployment or training demonstrated |
| Runtime | Adapter mode is named `vllm`; that name does not establish the provider's serving stack. Startup requires a listed model and valid probes; no fixture fallback |
| Public deployment | Fixture-only Vercel demo; live inference belongs on a private long-running host with server-side credentials |
| Optional Gemma | Smoke/startup evidence exists, but no end-to-end cases or benchmark. Last recorded startup failed closed because Gemma was no longer listed |

The benchmark records commit `55be4ab`, a dirty working tree, dataset SHA-256, prompt hashes and scripted cases. [AMD evidence](docs/AMD_EVIDENCE.md) explains clock differences, failures and reproduction. Current code also rejects mismatched provider-reported model IDs; that later guard was **not exercised in the historical live run**.

## AI Executive Team and Commerce Recovery Mission

![AI Executive Team](docs/submission/assets-20261018/05-ai-team.png)

Six versioned specialist roles analyse a **synthetic** store's decline. Each sees only its own scoped metrics, has its own private chat, and returns schema-validated JSON with evidence citations and measured/hypothesis labels. Deterministic functions compute every figure (margin bridge, support capacity); statements with unsupported numbers are withheld. Conflicting proposals are surfaced for the owner, not overruled by the CEO. No role has a tool that moves money: a refund recommendation can only start a JARVIS case, where policy decides.

- **Public site:** fixture specialists, labelled as such (no model calls).
- **Live:** owner-run `scripts/team-live-run.ps1 -WithAmd` (hidden key prompts, free model only, hard request cap, any reported cost stops it, no retries). Recorded results are linked above.

## Policy Stress Lab and Merchant Impact Studio

In Judge Mode: the **Stress Lab** lets you inspect all 30 pinned cases and compare identical fixture proposals with and without the policy layer (0 vs 18 unsafe counterfactual outcomes). The **Impact Studio** changes workload and cost assumptions; its outputs are hypotheses, not measured savings.

## Security controls (enforced and tested)

- The model proposes; deterministic code authorizes, executes (simulated) and verifies.
- Model output: strict schemas, role checks, tool allowlist, figure check; served-model and provider-model mismatches fail closed.
- Provider limits: free-only OpenRouter, request caps counted per call, cost stop, no retries, one call at a time; local server bound to `127.0.0.1`.
- Cloud (separate Supabase project): RLS on every table, owner/operator/viewer roles checked server-side with the caller's own JWT, append-only audit, single human approval and idempotent simulated execution in SQL, provider keys only in function secrets (configured; inference flags off).
- A live post-deploy test found a role-lookup bug in the gateway on 18 Oct; it was fixed, regression-tested and redeployed.
- Threat model and remaining risks: [SECURITY-THREAT-MODEL.md](docs/competition/SECURITY-THREAT-MODEL.md), [cloud risk register](docs/cloud/JARVIS-CLOUD-ARCHITECTURE.md). No certification is claimed.

## Technology

TypeScript on Node.js 24 (API, policy engine, simulated gateway) · React 19 + Vite + Tailwind v4 (web) · zod schemas · Vercel (public fixture demo) · AMD-hosted OpenAI-compatible endpoint with DeepSeek-V4-Flash (recorded live runs) · OpenRouter free model for the AI Team (recorded live runs) · Supabase Postgres, Auth and Edge Functions (Deno) for the cloud foundation · Playwright browser suites.

## Run it locally

Requires **Node.js 24 or later**. From the repository root:

```bash
npm ci
npm ci --prefix apps/web
npm run api:start
```

In a second terminal:

```bash
npm run web:dev
```

Open [the local workspace](http://127.0.0.1:43123/#/command-center). The API defaults to port 3000 and fixture AI; no model key is required. Use the demo store or canonical scenarios to create cases. Free-text requests require a server-side operator token.

Verify locally, with the API running:

```bash
npm run demo:verify
npm run api:typecheck
npm test
npm run web:build
npm run api:bench:ci
```

On the release commit these gave API 359/359, web 155/155, legacy 58/58 (`npm run legacy:check`), build OK and 0 unsafe autonomous actions; `npm run api:baseline` gives 0/30 vs 18/30. Browser suites: `apps/web/e2e/*.e2e.mjs` (see each file header). They are reproduction commands, not a claim about current CI status. For hosted inference, follow the [owner runbook](docs/OWNER_RUNBOOK.md), [AMD reproduction steps](docs/AMD_EVIDENCE.md) and [environment template](apps/api/.env.example). Live calls require credentials and can incur provider charges.

## Explore the implementation and receipts

| Start here | What you can inspect |
|---|---|
| [Judge Mode](https://jarvis-actiii-preview.vercel.app/#/judge) · [walkthrough](docs/improvement/JUDGE_WALKTHROUGH.md) | Run the outcomes, see who decides each step, inspect the recorded AMD run |
| [CLAIMS.md](CLAIMS.md) | Every claim with its evidence file and reproduce command |
| [AMD provenance](docs/improvement/AMD_PROVENANCE.md) | What ran on AMD, what ran locally, measured latencies, open questions |
| [Security review](docs/improvement/SECURITY_REVIEW.md) · [technical reference](docs/TECHNICAL_REFERENCE.md) | Findings and fixes; ingress, AI modes, deployment and known limits |
| [Business case](docs/improvement/BUSINESS_CASE.md) | Buyer, workflow, assumption-labelled value model, pilot plan |
| [Evidence summary](docs/submission/EVIDENCE_SUMMARY.md) | Historical checks, dates, verified and unverified claims |
| [Pinned dataset](data/cases/duplicate-charge-eval.v1.json) · [evaluator](apps/api/eval/run-benchmark.ts) | Ground truth and metric definitions, including safe failures |
| [Hero evidence map](docs/submission/HERO_EVIDENCE_MAP.md) | Three outcomes linked to raw audit artifacts |
| [Implementation status](docs/IMPLEMENTATION_STATUS.md) | Implemented capabilities and outstanding work |
| [Business evidence](docs/BUSINESS_EVIDENCE.md) | Measured technical results versus assumption-labelled estimates |
| [Demo script](docs/DEMO_SCRIPT.md) · [screenshot gallery](docs/screenshots/) | Merchant workflow and earlier fixture UI captures |
| [Submission and film](https://lablab.ai/submissions/lp1nzpneomsafp3lv6rjp220) · [final deck](docs/submission/deck/jarvis-deck.pdf) | Public submission and repository presentation materials |

The workspace includes orders, customers, inbox, approvals, audit and analytics. Recorded cases are stored in this browser (newest 50); sample analytics are separately labelled. Duplicate-charge refunds are the working automation. Other catalog entries are previews. See the [build contract](docs/JARVIS_ACT_III_BUILD_CONTRACT.md) and owner runbook for operational boundaries.

## Limits that matter

- **Synthetic data and simulated gateway:** no real payments, external store connection or production customer deployment demonstrated.
- **Human review is review-only:** escalation does not implement a complete approval-to-payment workflow.
- **Finite evaluation:** one historical hosted-model benchmark, with conservative misses and two scripted cases; zero observed unsafe actions does not prove general safety.
- **In-memory controls:** limits apply per process; serverless limits are per instance and budgets reset on restart. Serverless live-model mode exists only behind an explicit opt-in (`JARVIS_SERVERLESS_REAL_MODEL=enabled`); with per-instance quotas and per-instance startup probes, unrestricted public paid inference would be unsafe, so the public demo stays fixture-only.
- **Idempotency is per world:** each public demo request gets a fresh synthetic world; a real deployment needs durable idempotency keys shared across workers.
- **Shared operator token:** no per-user identity or token-use audit. Run the Node server behind a trusted TLS proxy; see the runbook.
- **Live model runs are recorded, not public:** the AMD and OpenRouter results come from owner-run scripts; the public site never calls a model. The cloud backend has no sign-in UI yet and its inference flags are off.
- **No store connector:** the Demo Store is read-only with four canonical synthetic orders; creating custom test orders is not implemented yet.
- **Provider availability changes:** historical receipts do not promise present availability. Gemma cases, self-hosted GPUs, Evolus integration and measured commercial impact remain unproven.

---

<div align="center">

**Inspect the evidence. Follow the decision. Verify the action.**

[Open Judge Mode →](https://jarvis-actiii-preview.vercel.app/#/judge)

</div>
