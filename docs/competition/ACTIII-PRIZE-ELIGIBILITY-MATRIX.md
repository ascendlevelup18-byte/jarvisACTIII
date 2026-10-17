# ACT III prize eligibility matrix

Source for every rule: the official event page, https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii (read 17 Oct 2026, 16:20 UTC). Status values: **VERIFIED** (every mandatory requirement evidenced), **PARTIAL**, **BLOCKED**, **NOT APPLICABLE**. Updated as work lands on `feature/actiii-grand-championship`.

## Summary
| Prize | Status | One-line reason |
|---|---|---|
| AMD main · Reinvent Commerce | **PARTIAL** | Real AMD-hosted inference ran end to end on 14 Oct (recorded); the product judges open runs fixture AI and only replays that record. A fresh controlled live run is ready to execute once the owner approves the key and budget. |
| Google Gemma | **BLOCKED** | Gemma-4-31B-IT answered one smoke call (15 Oct) but then disappeared from the endpoint's model list; no Gemma-powered JARVIS case has completed. |
| Evolus Business Agents | **BLOCKED** | No Evolus workspace use, no own vLLM endpoint on AMD Developer Cloud, no container. |
| Vibe Generation special prize | **PARTIAL** | No separate entry step is published; it is judged on its own criteria. Nothing to claim; eligibility follows the main entry. |
| Imment (Best Italian Teams) | **NOT APPLICABLE** | Team is not Italian (owner to confirm). |

## AMD main prize · Reinvent Commerce
| Exact rule (quoted) | Required implementation | Existing evidence | Missing evidence | Status | Work / time / cost | Proof location |
|---|---|---|---|---|---|---|
| "Every project must run a meaningful part of its workload on AMD infrastructure or AMD hardware." | Model understanding + proposal on an AMD-hosted endpoint | 14 Oct run on AMD-hosted DeepSeek-V4-Flash: 17/17 demo checks, 30-case benchmark 26/30, 0 unsafe (`evals/results/*tf-1*`, `demo-evidence-live-20261014T201902Z.json`) | A run of the current code; the endpoint used (`developer.amd.com.cn/radeon/api/v1`) is not confirmed to be the Token Factory named by the FAQ (`notebooks.amd.com/tokenfactory`) | PARTIAL | Owner-run live gate on the current build (≈20 calls, < $0.10, existing hidden-key script), ~30 min | `evals/results/live-gate-*`, new run id |
| "The AMD component must be part of the working product shown to the judges." | Judges see AMD output in the product | Judge Mode shows the recorded run, labelled "recorded, not live" | Live AMD in the public demo is not safe with an exposed key on an unauthenticated endpoint | PARTIAL | Keep the public demo fixture; show fresh recorded AMD evidence; optional private live demo for the video | Judge Mode §4, new evidence file |
| "AMD is a required technology to be eligible for prizes." | AMD in the stack | As above | — | PARTIAL | — | — |
| Reinvent Commerce: "Do not use a language model as the only forecasting method." | Deterministic calculations | Policy and money are deterministic; AI Team metrics, margin bridge and capacity are deterministic | — | VERIFIED for this rule | — | `apps/web/src/team/metrics.ts`, `apps/api/src/policy-engine.ts` |
| "Show how your product turns customer or business data into a useful recommendation or action." | Data → action | Four synthetic cases → verified refund or escalation; AI Team prototype → plan | A live run of the integrated mission (built and tested on mocks; `scripts/team-live-run.ps1 -WithAmd` runs team plan → case #48291 on the AMD model) | PARTIAL | Owner-run, ~11 OpenRouter (free) + ~4 AMD calls | `evals/results/team-live-*.json` |
| Submission: title, descriptions, tags, cover, video, slides, public repo, demo URL, working prototype | Complete entry | All present and verified 17 Oct | — | VERIFIED | — | lablab page |

## Not prize evidence
The AI Executive Team runs on OpenRouter (`nvidia/nemotron-3-super-120b-a12b:free`, chosen 17 Oct because `qwen/qwen3.8-27b` had no free variant). OpenRouter is not AMD infrastructure, so it counts toward neither the AMD requirement nor Gemma-on-AMD. A Gemma model reached through OpenRouter (`google/gemma-4-31b-it:free`) would not count either. The Supabase cloud backend (`jarvis-actiii-cloud`) is infrastructure, not AMD compute.

## Google Gemma
| Exact rule (quoted) | Required implementation | Existing evidence | Missing evidence | Status | Work / time / cost | Proof location |
|---|---|---|---|---|---|---|
| "Use Gemma in your project for a chance to win the Google prize." | Gemma doing real work in JARVIS | Dual-model support (Gemma for understanding, DeepSeek for decision; commit `8bbee09`); one Gemma smoke call HTTP 200 (`gemma-live-001.json`) | A completed Gemma-powered case: first attempt timed out at the startup probe; later `/models` no longer listed Gemma (`live-gate-20261015T230049Z.json`) | BLOCKED | Owner re-checks `/models`; if Gemma is back, run the dual-model live gate (≈20 calls); else needs AMD Developer Cloud GPU access to serve Gemma ourselves | `evals/results/live-gate-*` |
| Page: Gemma "running on AMD GPUs in the cloud using AMD Developer Cloud and ROCm" + general AMD rule | Gemma on AMD infrastructure | Gemma was served by the AMD-hosted endpoint as `self-dploy/Gemma-4-31B-IT` | Hardware/ROCm identity is not visible from a hosted API; no own Developer Cloud instance | BLOCKED | AMD Developer Cloud GPU instance (owner access unknown) + vLLM/ROCm serving | — |

## Evolus Business Agents
| Exact rule (quoted) | Status | Missing |
|---|---|---|
| "Build in a free Evolus event workspace, created at app.evolus.ai with the event code shared at kickoff." | BLOCKED | Workspace and event code not available to this session |
| "the main agent must use an open model served on AMD infrastructure through your own vLLM endpoint on AMD Developer Cloud." | BLOCKED | No Developer Cloud GPU instance; the hosted AMD API is not "your own vLLM endpoint" |
| "Use at least two Evolus building blocks" via "the Evolus REST API" | BLOCKED | Depends on the two rows above |
| "containerized app, public GitHub repository, a README that runs", "Never commit API keys" | PARTIAL | Public repo and runnable README exist; no container yet; no keys committed |
Decision: do not spend the competition window on Evolus unless the owner has both the workspace code and a Developer Cloud GPU today.

## Vibe Generation special prize
Criteria quoted: Hybrid "Strategic thinking, ability to quantify value, commercial attitude"; Becreatives "Quality of technical execution, orchestration of AI tools, ability to ship"; Vibe Generation "Taste, originality of the concept, design of the human plus AI creative workflow." No separate entry process is published. Nothing to build specifically; the Merchant Impact Studio and the AI Team are relevant to "quantify value" and "orchestration".
