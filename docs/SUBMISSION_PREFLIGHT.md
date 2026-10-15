# Submission preflight (prepared 13 Oct 2026; planning cutoff Oct 18 2026, 14:00 UTC = 7:00 PM Pakistan time)

**Deadline (14 Oct 2026 update):** public sources conflict. The event page gives the online build as 12–18 October with on-site sessions on 17–18 October (Rome closes 5:00 PM on Oct 18), and its schedule section says "To be announced". The owner plans against the conservative cutoff **Oct 18, 14:00 UTC (7:00 PM Pakistan time)**. Do not replace it with a later time unless an official organizer source states one.

**What to Submit (read directly from the event page, 14 Oct 2026):** project title, short and long descriptions, selected challenge, technology tags, working prototype; presentation with cover image, demo video, pitch presentation, and a clear explanation of the problem and intended user. Technology requirement: a meaningful part of the workload runs on AMD infrastructure or hardware, and the AMD component is part of the working product shown to judges. Event FAQ: the event is hosted on `notebooks.amd.com/tokenfactory`; the $100 cloud credit is not needed to participate, "just the api from the tokenfactory". Evolus track only: containerized app, public GitHub repository, own vLLM endpoint on AMD Developer Cloud (see `docs/EVOLUS_INTEGRATION.md`).

**Sources:** public web pages only. The build sandbox cannot open lablab.ai, so nothing here comes from organizer channels. **Before submitting, read the live "What to Submit" section** of https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii. Where the items below disagree with it, it wins.

## Requirements as publicly described

| Requirement | Source and confidence | Status | Owner action |
|---|---|---|---|
| Title, short and long description, challenge/track, technology tags | Event page (per search summary), **high** | Drafted in `docs/SUBMISSION.md` | Choose the track; paste |
| Working prototype | Event page, **high** | Works locally and as a `vercel build`; `npm run demo:verify` 13/13 | Deploy a preview (`docs/OWNER_RUNBOOK.md` §8) |
| **A meaningful part of the workload runs on AMD infrastructure or hardware, visible in the product judges see** | Event page (per search summary), **high**. **Met locally (15 Oct update)** | Live AMD-hosted DeepSeek-V4-Flash ran JARVIS end to end on 14 Oct (`docs/AMD_EVIDENCE.md`). The public demo still runs fixture AI, so the recording must show the live model (Mode A in `docs/submission/recording/RECORDING_SCRIPT.md`) | **Top priority:** runbook §3–§7 (Token Factory). Show the `MODEL · <id>` chip in the recording. Fill in `docs/AMD_EVIDENCE.md` |
| Public GitHub repository with a runnable README | Aggregator (aicompetition.dev), **medium** | README with quick start; repo visibility is your call | Confirm visibility; README §Quick start |
| Application / demo URL | Aggregator, **medium** | Not yet (preview not deployed from the current head) | Runbook §8–§9; decide on deployment protection |
| Cover image | Aggregator and older lablab recap, **medium** | **Prepared:** `docs/submission/cover.png` (1920×1080, from a real screenshot) | Check the size limits on the form |
| Demo video | Aggregator and older recap, **medium** | Script and shot list ready (`docs/DEMO_SCRIPT.md`, `docs/STORYBOARD.md`) | Record (runbook §10) |
| Slide presentation | Aggregator and older recap, **medium** | **Outline prepared below**; no deck file | Build the deck from the outline; export to PDF |
| Containerized application (some tracks) | Aggregator, **low** (track-specific) | No Dockerfile | Check whether your track requires it |
| **Evolus track:** main agent on an open model served via **your own vLLM endpoint on AMD Developer Cloud**, plus ≥ 2 Evolus building blocks | Evolus blog and aggregator, **medium** | Not met: no Evolus access; Token Factory may not count as "your own vLLM endpoint" | Decide whether to enter the Evolus track; if so, `docs/AMD_DEPLOYMENT_RUNBOOK.md` (self-hosted vLLM) and `docs/EVOLUS_INTEGRATION.md` |

**Uncertainties to resolve on the live page:**
- Video length and format limits.
- Slide format.
- Whether a protected preview URL is acceptable.
- Whether hosted Token Factory satisfies "AMD infrastructure" for your chosen track.
- Whether the repository must be public at submission time.

## Slide outline (only claims backed by the repo)

1. **Title:** JARVIS Automations: AI proposes, policy decides, refunds are verified. Use `docs/submission/cover.png`.
2. **Problem:** duplicate-charge tickets are repetitive but financially risky; a refund agent can be talked into the wrong refund.
3. **Product:** the merchant workspace (Dashboard, Orders, Support inbox + Copilot, Analytics, Approvals, Audit). Screenshots `c05`, `c03`, `c04`.
4. **How a case flows:** request → AI understanding → evidence from records → AI proposal → deterministic policy and revalidation → simulated gateway → read-back verification → audit (`docs/SUBMISSION.md` architecture).
5. **Safety in practice:** #48291 refunded and verified; #48294 escalated with $0 moved; #48293 closed with no second refund. Screenshot `02-safety-showdown.png`.
6. **Evidence:**
   - 0 unsafe autonomous actions on the pinned 30-case benchmark (fixture model, CI-gated);
   - 29/30, with DC-S04 a conservative escalation;
   - `demo:verify` 13/13;
   - test counts.
7. **AMD:** one OpenAI-compatible adapter (Token Factory or vLLM on AMD Instinct), fail-closed startup. **Only after a live run:** model id, latency and the real-model benchmark result from `docs/AMD_EVIDENCE.md`.
8. **Limits and next steps:** simulated payments, synthetic store, review-only approvals, five preview modules. Next: real store integration and human approval execution.

## Do not claim

- Live AMD inference before `docs/AMD_EVIDENCE.md` records it.
- Evolus integration.
- Real refunds or revenue.
- Sample-mode analytics as results.
- Any time or cost saving as measured.
