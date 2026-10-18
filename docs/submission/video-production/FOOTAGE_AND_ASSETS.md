# Footage to record and assets already available

## Real screen recordings required (record after the UI redesign lands)

Record with the live AMD model (Mode A in `docs/submission/recording/RECORDING_SCRIPT.md`): `start-live-api.ps1` in one window, `npm run web:dev` in another, http://127.0.0.1:43123 in a clean browser at 1920×1080. Run `npm run demo:verify -- --real-model` first, then Settings → *Clear recorded cases*.

| ID | Length to capture | What to record | Must be visible |
|---|---|---|---|
| R1 | 25 s | Dashboard after clearing cases, slow mouse movement over the header status chips | The AI chip showing the live model; "payments simulated" |
| R2 | 30 s | Demo store → order #48291 → *Request a refund* → send → wait for the reply | The customer reply with "$89.99" and the refund confirmation |
| R3 | 25 s | Orders → #48291 → case evidence / proof chain, scroll the audit events | An AI-call event with `vllm:DeepSeek-V4-Flash`, POLICY_EVALUATED, ACTION_ATTEMPTED, VERIFICATION |
| R4 | 25 s | Demo store → #48294 → send | ESCALATED; reply says a person will review; no refund |
| R5 | 15 s | Demo store → #48293 → send | CLOSED_NO_ACTION; no second refund |
| R6 | 25 s | Audit trail filtered to the cases; Approvals queue | Review-only label; escalations listed |
| R7 | 15 s | The PowerShell window running the API showing the `[jarvis] ai startup:` and `listening` lines, then the AI provider page | Model `DeepSeek-V4-Flash`, `probes: ok`. **Never show the key prompt while typing, and never show any other terminal** |

Live-model cases take about 5 to 15 s each. Record the wait; trim in the edit, never cut the result.

## Screenshots available (`docs/screenshots/`, taken before the UI redesign, fixture AI)

| File | Shows | Use |
|---|---|---|
| `c05-overview.png` | Dashboard with recorded cases | Backup for R1 (label "earlier UI") |
| `02-safety-showdown.png` | Proof Mode: #48291 resolved vs #48294 adversarial escalated | Backup for scene 6; the adversarial message text |
| `03-investigation-resolved.png`, `04-investigation-blocked.png` | Case investigations | Backup for R3 |
| `c03-inbox-copilot.png` | Support inbox with Copilot | Optional |
| `c04-analytics.png`, `c08-approvals.png`, `c11-orders.png` | Analytics, approvals, orders | Optional |
| `m03-store-refund.png`, `m04-store-escalation.png` | Demo store outcomes | Backup for R2/R4 |
| `docs/submission/cover.png` | Cover image | Thumbnail |

These show **fixture AI** chips. If used, add "Earlier UI · fixture AI" in the lower-third.

## Diagrams and slides available

- `docs/submission/deck/jarvis-deck.pdf`: slide 4 (pipeline), 5 (AMD), 6 (scenarios), 8 (evaluation), 9 (architecture). Export single slides as PNG with headless Chrome: `chrome --headless=new --window-size=1920,1080 --screenshot=s8.png "file:///C:/jarvis-actiii-preview/docs/submission/deck/jarvis-deck.html#s8"`.
- `docs/submission/ARCHITECTURE_SUMMARY.md`: text pipeline diagram.
