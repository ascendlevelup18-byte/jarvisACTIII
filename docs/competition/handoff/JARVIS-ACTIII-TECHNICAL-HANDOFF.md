# JARVIS ACT III: technical handoff for the presentation, video and lablab update

Prepared 18 Oct 2026, 06:30 UTC, by Claude Code for ChatGPT Work. Every number below was checked against a committed evidence file or a test run against production. Anything not listed under "Safe to claim" should not be claimed.

## 1. Release (live now)
| Item | Value |
|---|---|
| Production URL | https://jarvis-actiii-preview.vercel.app/#/judge |
| Vercel deployment | `dpl_93Arf3SMmJm5qZ4qhUTniXeTeXUA` (READY, production alias) |
| Git | `c69ca2ccffd22a218dbef006f0e6ca893e0a1f60` on `claude/kickoff-day1-jkg6ry` (public) |
| Repository | https://github.com/ascendlevelup18-byte/jarvisACTIII |
| Rollback | promote `dpl_5GtjQFYi6ChkCYEmCX9ELsvYB5AP` (`be52013`); then `dpl_BHvrCqExwQAPjcEq9ARc32y5viZD` |
| lablab entry | https://lablab.ai/submissions/lp1nzpneomsafp3lv6rjp220 (unchanged by Claude) |

**Production verification (18 Oct, against the live URL):**
- **Verifier: 16/16.** Four canonical orders, refusal of free text and altered requests, no double refund.
- **Judge Mode: 12/12.**
- **Judge reliability: 6/6.**
- **AI Team browser suite: 13/13.** Covers the boardroom, the Commerce Recovery Mission, HTML injection, keyboard use and a 375 px phone.
- **Extra checks: 23/23.**
  - Every main route loads on desktop and a 375 px phone with no horizontal overflow and no console errors.
  - The 17 Oct AMD panel is shown.
  - The public API runs fixture AI with simulated payments.
  - The live team endpoint is not served publicly.
  - There are no keys or key names in the bundle.
  - GitHub and the evidence files open while signed out.

## 2. What judges can see on the site
1. **Judge Mode §1–3: four outcomes, live on the page (deterministic fixture AI).**
   - #48291 duplicate charge → $89.99 simulated refund, verified by read-back.
   - #48294 $5,000 demand → denied and escalated.
   - #48293 already refunded → no action.
   - #48292 $250 claimed vs $180 recorded → escalated.
   - Each card has "Inspect why", showing the policy checks, evidence and audit chain.
2. **Judge Mode §4: 17 Oct 2026 AMD-hosted run (NEW).** All four orders on `vllm:DeepSeek-V4-Flash` (served as `self-dploy/DeepSeek-V4-Flash`); 25/25 checks; key found in files: 0. Labelled "recorded, not a live model call on this page". Screenshot: `screenshots/03-amd-live-run-17oct-25of25.png`.
3. **Judge Mode §4 (below it): 14 Oct 2026 AMD run.**
   - Three orders, 17/17 checks.
   - Plus the pinned 30-case benchmark on the AMD model: 0 unsafe autonomous actions, 20/20 required escalations, 26/30 exact expected outcome. All 4 misses erred toward safety and moved no money.
4. **Policy Stress Lab and Merchant Impact Studio** (Judge Mode §6 onward).
5. **AI Executive Team** (`#/ai-team`). Six specialists (CEO, CFO, Sales, CMO, COO, HR) with private chats, a boardroom and the Commerce Recovery Mission. On the public site this page runs **fixture specialists** and is labelled so.

## 3. New live results (recorded evidence; owner-run on the owner's PC)

### 3a. AMD core inference, 17 Oct 2026 21:00 UTC: PASSED
- **Model:** `DeepSeek-V4-Flash` on the AMD-hosted endpoint `developer.amd.com.cn/radeon/api/v1`. Served model `self-dploy/DeepSeek-V4-Flash`.
- **Checks: 25/25.** Each order made 2 AI calls (understanding + decision), all on the AMD model:

  | Order | Request | Outcome |
  |---|---|---|
  | #48291 | duplicate charge | APPROVE, simulated refund of 8,999 minor units (= the recorded charge), read-back verified |
  | #48294 | $5,000 demand | DENY, escalated, no execution |
  | #48293 | already refunded | NO_ACTION |
  | #48292 | $250 vs $180 | DENY, escalated |

- **Latency per call:** understanding 1.8–3.1 s; decision 6.3–8.3 s.
- **About 12 AMD calls in total.** 0 failures, 0 retries, env cleared, key in files 0.
- **Caveat:** the run used `da409c0` plus uncommitted cloud files (`gitDirty: true`). Those files are not used by the local refund path.
- **Evidence:** `evals/results/live-gate-20261017T210008Z.json`, `evals/results/demo-evidence-live-20261017T210008Z.json`.

### 3b. AI Executive Team on OpenRouter, 18 Oct 2026: PASSED on the final run
- **Model:** `nvidia/nemotron-3-super-120b-a12b:free`. Listed at $0. Key limit 0 / free tier. Every call reported cost $0.
- **Stage results:**
  - CFO alone: ok.
  - CFO + COO + CEO: all ok.
  - **All six specialists: all valid** on the final run (`team-live-20261018T055512Z.json`).
  - The plan has **20 proposals, all awaiting owner approval; nothing executed**.
- **Two real disagreements were surfaced, not overruled.** On product quality and on acquisition spend, the CEO wanted an increase while the CFO, COO or CMO wanted a decrease. The plan marks both "Owner decision".
- **Private CFO answer (verbatim excerpt):** "The margin fell 5.86 percentage points … Refunds as a share of gross sales jumped from 3 % to 7.29 % … representing an excess refund cost of $11,610 … contributing ‑2.76 pts to the margin drop … Higher COGS added another ‑3.1 pts." Every figure matches the deterministic calculations, and the number check withheld nothing.
- **Earlier failed attempts are kept as evidence.**
  - The model spent all 900 output tokens reasoning and returned no answer. Fixed by short reasoning and a 4000-token limit.
  - On one run, two specialists used out-of-list field values. The schema rejected them, and the prompt was fixed.
  - Total OpenRouter usage across all runs: 20 calls, $0.
- **Evidence:** `evals/results/team-live-20261018T055512Z.json` (final), `…T054209Z`, `…T054026Z`, `…T053156Z`, `…T053008Z`.

### 3c. Commerce Recovery Mission (AI reasoning → controlled action), 18 Oct 2026: PASSED
1. The live team's proposal "Reduce refunds through stricter quality checks and clearer product descriptions" (lever: refunds) was linked to the canonical duplicate-charge order #48291. The dataset does not claim they are the same company's records.
2. JARVIS ran the case on **AMD `DeepSeek-V4-Flash`**.
3. Deterministic policy: **APPROVE**.
4. Simulated refund executed and **read-back verified**.
5. Evidence: stage `5-mission` in `team-live-20261018T055512Z.json`.

## 4. Safety and security (verified)
- **Benchmarks:**
  - Pinned 30-case benchmark: **0 unsafe autonomous actions** (fixture), unchanged.
  - Offline baseline from the same proposals: **JARVIS 0/30 unsafe vs 18/30 unsafe without policy** (11 unsafe money movements avoided).
- **Model limits:**
  - Models propose and cannot authorize; policy, the simulated gateway and read-back verification are deterministic code.
  - Free-tier controls: a hard request cap counted per call, any reported cost stops the provider, a 429 or 402 stops it with no retries, and one call runs at a time.
- **Figure check:** any sentence or proposal stating a number the data cannot produce is withheld. 19 adversarial formats are tested, including scientific notation, "$1.2M", full-width digits and spelled-out amounts.
- **The local server binds to 127.0.0.1 only.**
- **Cloud backend (Supabase project `jarvis-actiii-cloud`, Free, separate from the public site):**
  - Postgres schema with row-level security.
  - **46/46 database security checks** on the real database: cross-user and cross-org isolation, role escalation, forged and replayed approvals, duplicate refunds, quota, audit tampering, data export and deletion.
  - Authenticated gateway function deployed (v2).
  - **28/28 live security checks** against the deployed function, with no model calls.
  - That live test **found and we fixed a real role-lookup bug** (a member could be treated with another member's role); fixed in `603ad90`, redeployed.
  - Provider keys are stored as Supabase secrets and confirmed by a yes/no health check. **Live inference flags are off.**
- **Tests:** API 359, web 155, legacy 58, all passing. Build OK. No secrets in the repo or the bundle.

## 5. Safe to claim
- JARVIS ran its full refund workflow on **real AMD-hosted inference (DeepSeek-V4-Flash)** on 14 Oct and again on 17 Oct. All four demo orders passed on 17 Oct (25/25 checks), with every AI step on the AMD model.
- AI understands and proposes; **deterministic policy decides**; payments are **simulated** and **verified by read-back**; every step is audited.
- On a pinned 30-case adversarial benchmark: **0 unsafe autonomous actions**; without the policy layer, 18 of 30 outcomes would have been unsafe.
- A **six-specialist AI Executive Team** produced live, schema-validated, figure-checked analysis on a free OpenRouter model. It surfaced disagreements for the owner instead of overruling them. Its refund recommendation was carried into a JARVIS case that ran on AMD, was authorized by policy and was verified by read-back.
- Numbers the data cannot support are **withheld, not shown with a warning**.
- A Supabase cloud backend with row-level security and an authenticated AI gateway exists and passed 46/46 database checks and 28/28 live security checks. Describe it as **a backend foundation, not part of the public demo**.
- Judges can verify outcomes themselves in Judge Mode, and every live result has a committed evidence file on GitHub.

## 6. Do NOT claim
- That the public site calls a live model. It runs deterministic fixture AI, and the live runs are shown as recorded evidence.
- That the OpenRouter/Nemotron model is AMD infrastructure, or that it counts for the AMD or Google prize.
- **Gemma or Google eligibility** (BLOCKED: no verified Gemma-on-AMD run) or **Evolus** (BLOCKED).
- Real payments, real customers or real merchant data. Everything is synthetic, and payments are simulated.
- That JARVIS is "fully secure", certified, production-ready for real money, or "never makes mistakes". The live AMD evidence covers four orders and a 30-case benchmark only.
- That the cloud backend is live for users. It is deployed and secured, but its inference flags are off and it has no sign-in UI yet.
- Exact AMD cost per call (not reported by the endpoint).
- Any number not in this document or its evidence files.

## 7. Evidence links (public, submitted branch)
- 17 Oct AMD: https://github.com/ascendlevelup18-byte/jarvisACTIII/blob/claude/kickoff-day1-jkg6ry/evals/results/demo-evidence-live-20261017T210008Z.json
- 17 Oct gate: https://github.com/ascendlevelup18-byte/jarvisACTIII/blob/claude/kickoff-day1-jkg6ry/evals/results/live-gate-20261017T210008Z.json
- AI Team + mission: https://github.com/ascendlevelup18-byte/jarvisACTIII/blob/claude/kickoff-day1-jkg6ry/evals/results/team-live-20261018T055512Z.json
- Release report: `docs/competition/RELEASE-CANDIDATE.md` · Prize matrix: `docs/competition/ACTIII-PRIZE-ELIGIBILITY-MATRIX.md` · Cloud design and risks: `docs/cloud/JARVIS-CLOUD-ARCHITECTURE.md` · Threat model: `docs/competition/SECURITY-THREAT-MODEL.md`

## 8. Screenshots (fresh from production, 18 Oct)
`screenshots/` next to this file:
- `01-judge-hero.png`
- `02-judge-four-outcomes.png`
- `03-amd-live-run-17oct-25of25.png`
- `04-amd-recorded-run-14oct.png`
- `05-ai-team.png`
- `06-judge-phone.png`

## 9. Suggested one-paragraph description update (for owner approval; Claude did not edit lablab)
> JARVIS Automations resolves payment exceptions such as duplicate charges with AI that proposes and deterministic policy that decides. On AMD-hosted DeepSeek-V4-Flash, all four demo orders passed live on 17 Oct 2026 (25/25 checks): a verified $89.99 simulated refund, a blocked $5,000 demand, no second refund on an already-refunded order, and an escalated amount conflict. On a 30-case adversarial benchmark it made 0 unsafe autonomous actions, against 18 unsafe outcomes without its policy layer. A six-specialist AI Executive Team analyses a synthetic store's decline. It withholds any number the data cannot support and leaves disagreements to the owner, and its refund recommendation flows into a JARVIS case that policy authorizes and read-back verifies. Payments are simulated and data is synthetic; Judge Mode lets anyone verify each outcome.
