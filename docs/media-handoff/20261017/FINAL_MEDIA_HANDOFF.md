# JARVIS final media handoff (for ChatGPT Work)

Prepared 17 Oct 2026 by Claude (engineering QA). Work owns the deck, film, captions and cover; this file supplies the deployed-product captures and the facts they must match. `CLAIMS.md` in the repository remains the single source for every number.

## 1. Released build (verified 17 Oct 2026, 09:40–10:00 UTC)

| Item | Value | How it was checked |
|---|---|---|
| Repository default branch | `claude/kickoff-day1-jkg6ry` at `534c767` | GitHub API, `git fetch` |
| Hosted CI on `534c767` | success, [run 39020646644](https://github.com/ascendlevelup18-byte/jarvisACTIII/actions/runs/39020646644) | GitHub Actions API |
| Production deployment | `dpl_DHM8iQbPJNcWHhaZPbf9VaS3b6ta`, created 09:16 UTC | `vercel inspect jarvis-actiii-preview.vercel.app` |
| Production source commit | `de17c15` (Vercel metadata; `gitDirty=1` from an uncommitted `.gitignore` line only) | deployment metadata |
| `de17c15` vs `534c767` | app code identical; HEAD adds one evidence JSON and a browser-test tweak | `git diff --stat` |
| Runtime | fixture AI, synthetic data, simulated payments, free text disabled, no model key | `GET /api/health` |

Judge Mode: https://jarvis-actiii-preview.vercel.app/#/judge

## 2. Captures supplied

All captured 17 Oct 2026 from the public production URL above (deployment `dpl_DHM8iQ…`, source `de17c15`), with Playwright 1.62.1 driving Chrome, no login. Every run used the real public API in fixture mode with simulated payments. Nothing was edited, composited or retouched. Browser console errors during capture: 0.

### Recording (motion)

| File | Length | What it shows |
|---|---|---|
| `recordings/01-judge-full-walkthrough-prod-1920x1080.webm` | 82 s, VP9, 1920×1080 | Hero and truth chips → Run all four (real API calls) → each card → Inspect why #48294 → authority map → offline baseline → recorded AMD run and replay → evidence files → Inspect why #48291 |
| `recordings/01-…timeline.json` | | Second-by-second markers for editing |

Method: Chrome DevTools screencast frames of the page viewport only (no browser chrome, no desktop), re-timed at their original timestamps into a 30 fps WebM. Frames arrive when the page changes, so smooth scrolls are slightly stepped; static holds are full quality. If Work needs MP4, transcode losslessly enough for 1080p (for example `ffmpeg -i in.webm -c:v libx264 -crf 16 -pix_fmt yuv420p out.mp4`). The AMD replay in this clip animates **recorded** latencies; narration over it must say "recorded".

### Screenshots (`screenshots/`, all real UI, PNG)

| File | Brief item | Content |
|---|---|---|
| `01-judge-hero-1920x1080.png` | 1 | Hero, chips "Fixture AI runtime", "Payments simulated · no real money", "AMD run: recorded, not live" |
| `02-four-scenario-controls-1920x1080.png` | 2 | Section 1 before running, "Run all four" |
| `02b-four-outcomes-1920x1080.png` | 2 | All four outcomes after a run |
| `03-card-48291-*.png` | 3 | $89.99 simulated, APPROVE, read-back verified (full frame and card crop) |
| `04-card-48294-*.png` | 4 | $5,000 injected demand, DENY, ESCALATED, $0.00 |
| `05-card-48293-*.png` | 5 | Already refunded, NO_ACTION, CLOSED_NO_ACTION, $0.00 |
| `06-card-48292-*.png` | 6 | $250 claimed vs $180 charged, DENY, ESCALATED, $0.00 |
| `07-authority-map-1920x1080.png` | 7 | Who decides at each step |
| `08-no-policy-baseline-1920x1080.png` | 8 | 0/0 vs 18/11, with "not an AMD or real-model result" label |
| `09-recorded-amd-run-1920x1080.png`, `09b-…replay…` | 9 | Recorded AMD section and finished replay |
| `10-inspect-why-48291-…`, `10b-inspect-why-48294-…` | 10 | Policy explanation and proof chain |
| `11-evidence-files-1920x1080.png` | — | Evidence file links |
| `12-judge-full-page-after-run-1920w.png` | — | Full page, tall image |
| `20–23-phone-390-*.png`, `20–23-phone-375-*.png` | — | Phone widths at 2× (hero, #48291, #48294, AMD section); no horizontal scroll |
| `30-command-center-1920x1080.png` | — | Command Center |

`*-crop.png` files are element crops of a single card from the same session; everything else is the full viewport. `capture-log.json` lists each file with its UTC time and URL.

## 3. Known visual defect in these captures

In section 4 the label "Recorded AMD-hosted inference — October 14, 2026 — not a live model call" renders in muted grey on navy (contrast about 2.3:1; it was meant to be cyan). A CSS rule overrides it. It is legible in 1080p captures but weak. A fix (10.5:1) and four-outcome navigation copy are on branch `release/final-lock-review`, **not deployed**; deploying needs the owner's approval. If it is deployed before Work exports, re-capture shots 09, 09b and 10b and the recording; otherwise keep the narration and slide text saying "recorded, not live" so the disclosure never depends on that label alone.

Also on the current deployment: the section-1 navigation link says "1 · Three outcomes" and the heading lists three, while four cards run. Avoid framing the nav link in close-up.

## 4. Numbers and the qualifications that must stay with them

| Claim | Must say alongside it |
|---|---|
| 17/17 live demo checks; 30 cases with 0 unsafe autonomous actions, 20/20 required escalations, 26/30 exact (DeepSeek-V4-Flash, 14 Oct 2026) | AMD-hosted endpoint, recorded run, not live in the public demo. Two benchmark cases used scripted decision outputs. 20/20 counts DC-A09, which expected ESCALATED and ended safely FAILED. The run was recorded at `55be4ab` with a dirty tree (the uncommitted `.gitignore` line only, per `docs/AMD_EVIDENCE.md`). No self-hosted GPU or ROCm. Endpoint not independently confirmed as the Token Factory portal. |
| 29/30 exact, 0 unsafe (fixture benchmark, every CI run) | Fixture model, separate from the AMD run. |
| Without policy: 18 unsafe outcomes, 11 unauthorized refunds; with JARVIS policy: 0 | Offline, simple fixture test proposer, not the AMD model; no baseline refund moved money. |
| Engineering: one refund under racing duplicates, read-back verification, 64 KiB body limit, 323 API / 89 web / 58 legacy tests | Payments simulated, data synthetic, one working automation, no real merchant, no security certification. |

All of the above were re-checked today against the raw evidence files; the baseline and fixture benchmark were also re-run locally and reproduced exactly.

## 5. Dependencies for the final film and deck

- The README links the current film (lablab storage MP4) and `docs/submission/deck/jarvis-deck.pdf`. Send the new MP4 and PDF when reviewed; I will prepare the exact README and lablab link swaps. Links will not be changed to files that do not exist yet.
- Slide 5 "Hero demo" in the earlier plan says three cards; use the four-card capture `02b`.
- No asset is missing on the engineering side. If Work needs a different crop, framing or a phone-width motion clip, name the scene.

## 6. Recommended final submission links

- Demo: https://jarvis-actiii-preview.vercel.app/#/judge
- Repository: https://github.com/ascendlevelup18-byte/jarvisACTIII
- Evidence ledger: https://github.com/ascendlevelup18-byte/jarvisACTIII/blob/claude/kickoff-day1-jkg6ry/CLAIMS.md
