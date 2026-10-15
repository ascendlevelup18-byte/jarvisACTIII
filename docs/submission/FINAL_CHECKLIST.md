# Final submission checklist

Requirements come from `docs/SUBMISSION_PREFLIGHT.md`, which read the public event page on 14 Oct 2026. **Re-read the live "What to Submit" section** at https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii before submitting; where it differs, it wins. Planning cutoff (owner's conservative choice, not an official time): **Oct 18 2026, 14:00 UTC (7:00 PM Pakistan time)**.

| # | Deliverable | Required? (source) | Status | File / action |
|---|---|---|---|---|
| 1 | Project title, short and long description, tags | Yes (event page) | READY | `SUBMISSION_DESCRIPTION.md` |
| 2 | Track / challenge selection | Yes (event page) | OWNER DECISION | Main track. Evolus track needs a self-hosted vLLM endpoint and a public repo (not met) |
| 3 | Cover image | Yes (event page) | READY | `cover.png` (1920×1080, earlier UI) |
| 4 | Pitch presentation / slides | Yes (event page) | READY (PDF) | `deck/jarvis-deck.pdf` (10 slides); source `deck/jarvis-deck.html` |
| 5 | Demo video | Yes (event page) | **MISSING** | Product footage: `recording/RECORDING_SCRIPT.md`; cinematic cut: `video-production/` |
| 6 | Working prototype | Yes (event page) | READY locally; preview login-protected | Turn off Vercel Authentication for previews, or share a bypass link |
| 7 | AMD workload visible in the product | Yes (event page) | READY for the video (Mode A); public preview is fixture-only | Record in Mode A; cite `EVIDENCE_SUMMARY.md` |
| 8 | Public GitHub repository with README | Medium confidence (aggregator) | **NOT MET**: repo returns 404 to anonymous visitors | Owner decides visibility |
| 9 | Application URL | Medium confidence (aggregator) | Preview exists, protected; production alias is 3 days old | Unprotect the preview, or approve a production deploy |
| 10 | Container / Dockerfile | Low confidence, track-specific | Not present | Only if your track requires it |
| 11 | AMD key rotated | Security | **OPEN** | AMD dashboard or organizers |
| 12 | Google prize (Gemma) | Optional partner prize (event page) | **Blocked: Gemma-4-31B-IT is no longer in the endpoint's model list (15 Oct, run tg-1).** Code stays opt-in; submission is AMD-only | Owner: free model-list recheck (no -Model); ask organizers whether Gemma will return |

## Postponed owner actions (need your key, accounts or approval)

1. Live AMD + Gemma benchmark. First `node scripts/live-preflight.mjs --understanding-model Gemma-4-31B-IT` (offline), then in a new Windows PowerShell without Start-Transcript: `cd C:\jarvis-actiii-preview; Set-ExecutionPolicy -Scope Process Bypass -Force; & .\scripts\live-gate.ps1 -BaseUrl https://developer.amd.com.cn/radeon/api/v1 -UnderstandingModel Gemma-4-31B-IT -TimeoutMs 90000 -Port 3210 -RunId tg-1` (key only at the hidden prompt; ~20–30 min). Startup already passed live once (8.0 s Gemma probe). If cases fail or time out, submit AMD-only and leave Gemma out of the claims.
2. Ask organizers: does Token Factory-served Gemma count for the Google prize; is there a separate field; exact deadline.
3. Rotate the AMD key (dashboard or organizers).
4. When ChatGPT Work finishes: say "integrate" so Claude commits the frontend separately and reruns all suites.
5. Record the video (Mode A, `recording/RECORDING_SCRIPT.md`; stop the fixture API on port 3000 first).
6. Approve: Vercel preview deploy and turning off preview authentication; pushing the branch; making the repo public.

## Before you press Submit

- [ ] Video recorded, watched once end to end, no secrets on screen.
- [ ] Slides PDF re-exported if any number changed (`chrome --headless --no-pdf-header-footer --print-to-pdf=... deck/jarvis-deck.html`).
- [ ] Demo URL opens in a private window without a login.
- [ ] Repository visibility matches the rules.
- [ ] After the UI restyle: `npm test`, `npm run legacy:check`, `npm run api:bench:ci`, `npm run demo:verify` all pass.
- [ ] Links in `SUBMISSION_DESCRIPTION.md` filled in.
- [ ] Video passes `video-production/CLAIMS_CHECKLIST.md`.
- [ ] Procedures in `RELEASE_PROCEDURES.md` §1–§8 done.
