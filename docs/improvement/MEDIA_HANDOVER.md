# Media refresh handover (video, slides, cover, lablab text)

For the presentation workflow (ChatGPT Work or the owner). Record only after the release is deployed and approved, from the production URL, so footage matches what judges open.

## Story (3–4 minutes)

| # | Beat | Screen to record | Spoken claim (must stay exactly this strong) |
|---|---|---|---|
| 1 | The problem | Title card, then an "I was charged twice" ticket | Duplicate-charge tickets are routine, but they move money. |
| 2 | The failure | Judge Mode §2, "Remove the policy layer" panel | With the policy layer removed, the same proposals on our 30 test cases give 18 unsafe outcomes and 11 unauthorized refunds. *Say: offline, with a simple test proposer, not the AMD model.* |
| 3 | The solution | Judge Mode §2 authority map | The model proposes in two steps and has no authority in either; code owns every step that can move money. |
| 4 | Valid refund | Judge Mode §1, "Run all four", card #48291, then "Inspect why" | $89.99 simulated refund, policy APPROVE, read-back verified. |
| 5 | Adversarial demand | Card #48294 | $5,000 demand, policy DENY, escalated, $0, no gateway call. |
| 6 | Prevented double refund | Card #48293 | Already refunded: closed, no second refund. Optional: mention racing duplicates close as "refund already executed". |
| 7 | Proof on AMD | Judge Mode §4: label, model requested/served, call replay, 17 checks, benchmark strip | *On screen and in voice:* "Recorded AMD-hosted inference, 14 October 2026, not a live call." 17/17 checks; 30 cases, 0 unsafe, 20/20 escalations, 26/30 exact. |
| 8 | Business case | Slide: buyer, workflow, pilot | Support and payments ops at mid-size merchants; 30-day shadow-mode pilot. *No savings, customers or revenue claimed.* |
| 9 | Close | Judge Mode hero | AI proposes. Policy decides. Every refund is verified. Simulated payments. |

Never: show Judge Mode's AMD replay animating while saying "live"; imply self-hosted GPUs, ROCm, Gemma end to end, real payments, or measured savings.

## Slides (10)

1 Title · 2 Problem · 3 Why an LLM with a refund tool is unsafe (baseline panel, labelled offline) · 4 Architecture (authority map) · 5 Hero demo (three cards) · 6 Safety differentiation (record-derived amount, idempotency, replay accounting, read-back) · 7 Evaluation (live 14 Oct + fixture CI + baseline, each labelled) · 8 AMD integration and provenance (endpoint caveat kept) · 9 Business value and pilot · 10 Roadmap. Use fresh 1920×1080 captures of Judge Mode; keep "Payments simulated" and "recorded, not live" visible.

## Source of every number

`CLAIMS.md` is the single source. Before export, check each figure in the video, slides and lablab text against it.

## lablab.ai update (owner approves the exact text first)

- Tags: replace "DeepSeek V3" with DeepSeek-V4-Flash if available; remove "Agent Builder track - The INTERNET OF AGENTS".
- Demo link: `https://jarvis-actiii-preview.vercel.app/#/judge`.
- Slides: the new PDF. Video: the new MP4. Cover: optional refresh from a Judge Mode capture.
- Description: add the policy-layer comparison sentence with its scope ("offline, test proposer").
