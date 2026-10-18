# Final submission package (16 Oct 2026)

Everything the lablab.ai form needs, with where it lives and what was checked. Form text to paste: `SUBMISSION_DESCRIPTION.md`.

| Field | Value | Checked |
|---|---|---|
| Team / product | JARVIS Automations | — |
| Event / track | AMD Developer Hackathon ACT III · Reinvent Commerce | event page, 16 Oct |
| Title | JARVIS Automations: AI proposes, policy decides, every refund is verified | — |
| Repository | https://github.com/ascendlevelup18-byte/jarvisACTIII/tree/claude/kickoff-day1-jkg6ry | **private** on 16 Oct (anonymous API 404); security gate passed |
| Demo URL | https://jarvis-actiii-preview.vercel.app/#/command-center | anonymous `demo:verify` 13/13, hero 3/3, health `aiMode: fixture`, `paymentGateway: simulated` |
| Video | `JARVIS-ACTIII-FINAL-DEMO.mp4` from Work (owner's folder `MORE FINALISED 16OCT`) | see below |
| Captions | `JARVIS-ACTIII-CAPTIONS.srt` (34 cues; also burned in) | claims scan clean |
| Slides | `docs/submission/deck/jarvis-deck.pdf` (10 pages, 1920×1080) | rendered every page |
| Cover | `docs/submission/cover.png` | — |
| AMD evidence | `docs/AMD_EVIDENCE.md`, `evals/results/amd-live-001.json`, `demo-evidence-live-20261014T201902Z.json`, `duplicate-charge-eval.v1.vllm-deepseek-v4-flash-tf-1.json` | committed |

## Video (Work's final film)
- 8,238,016 bytes; identical SHA-256 in both of Work's output folders.
- Container read directly: 210.02 s (3:30), video `avc1` 1920×1080, audio `mp4a`. Work's QA: 30 fps, H.264 High, AAC-LC 48 kHz mono, fast-start, full FFmpeg decode with no errors, no black intervals, peak −2.2 dBFS.
- Narration is an offline synthetic voice (Microsoft Zira); no music.
- Claims in the narration and captions match the committed evidence: #48291 RESOLVED with a simulated $89.99 refund and read-back; #48294 DENY then ESCALATED; #48293 CLOSED_NO_ACTION; 14 Oct AMD run with 17/17 live checks, 20/20 escalations, 26/30 exact, 0 unsafe. No Gemma, Google, real-payment, self-hosted GPU or business-impact claims.
- Not done by anyone yet: one continuous human watch-and-listen pass (Work's QA says so). Do this before uploading.
- Keep the MP4 out of git; upload it through the form (or YouTube unlisted if the form asks for a link).

## Slides
Work's 10-slide redesign with the 16 Oct Command Center captures, copied into the repo (`deck/jarvis-deck.html`, images in `deck/assets/`). One correction: slide 5 said "Anonymous access remains a release blocker"; it now says the public demo runs fixture AI with simulated payments and no deployed key. All other pages render byte-identical to Work's PDF.

## Claims to keep (and avoid)
- Say: AMD-hosted DeepSeek-V4-Flash, live on 14 Oct; the public demo is fixture AI; payments simulated; data synthetic.
- Do not say: Gemma works end to end, Google prize eligibility, self-hosted AMD GPUs, real refunds, measured business impact.
