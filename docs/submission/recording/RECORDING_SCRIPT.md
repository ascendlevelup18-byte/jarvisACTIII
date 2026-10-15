# JARVIS demo video: recording script and shot list

Target length: **3:30** (check the live "What to Submit" section on the lablab.ai event page for the official limit before recording; it was not published when this was written).

The UI is being restyled separately. Page names below are the ones the app used on 14 Oct 2026 (Dashboard, Proof Mode, Orders, Support inbox, Analytics, Approvals, Audit trail, AI provider, demo store). **Do a 2-minute click-through after the restyle lands** and adjust any label that changed. Never say something the screen does not show.

## Two ways to record (pick one)

| Mode | What judges see | Use when |
|---|---|---|
| **A. Live AMD model (recommended)** | Header chip shows the real model (`MODEL · DeepSeek-V4-Flash` or the restyled equivalent); audit shows `vllm:DeepSeek-V4-Flash` | The key works today and the daily budget ($1, see response headers) is not used up |
| B. Fixture AI | Chip shows `FIXTURE AI` | The key is rotated or blocked. Then **do not say "running on AMD"** in the voice-over; say "tested live on AMD's hosted model; this recording uses the deterministic fixture" and show slide 5 / `docs/AMD_EVIDENCE.md` instead |

## Setup (Windows, 15 minutes)

1. **Screen:** 1920×1080, Windows display scaling 100% (Settings → System → Display). Close notifications (Focus assist / Do not disturb on).
2. **Browser:** Chrome or Edge, a fresh profile or guest window, zoom 100%, bookmarks bar hidden, only one tab. Full screen with F11 for the app shots.
3. **Audio:** USB or headset mic, quiet room. In the Windows sound settings set input volume so normal speech peaks around 70%. Record a 10-second test and listen back.
4. **Start the backend.**
   - Mode A, in a **new** Windows PowerShell window:
     ```powershell
     cd C:\jarvis-actiii-preview
     Set-ExecutionPolicy -Scope Process Bypass -Force
     & .\docs\submission\recording\start-live-api.ps1
     ```
     Type the key at the hidden `API key` prompt (never at `PS>`). Wait for the `listening` line.
   - Mode B: `cd C:\jarvis-actiii-preview` then `npm run api:start`.
5. **Start the app** in a second PowerShell window: `cd C:\jarvis-actiii-preview` then `npm run web:dev`, and open http://127.0.0.1:43123.
6. **Pre-flight** in a third window: `npm run demo:verify` (Mode A: `npm run demo:verify -- --real-model`). It must end with `ready to record`. Mode A uses about 8 model calls; that is fine.
7. In the app: Settings → *Clear recorded cases*, so the recording starts empty. Check the header chips.
8. **Recorder:** OBS Studio (Display Capture, 1920×1080, 30 fps, MP4) is best. Fallback: Xbox Game Bar, Win+Alt+R starts and stops recording of the active window (Win+G to check the mic is on).

Live-model note: each case takes roughly 5 to 15 seconds on DeepSeek-V4-Flash (median understanding 2.0 s, decision 8.9 s in the benchmark). Keep talking while it runs, or cut the wait in editing. Never cut a result.

## Shot list and voice-over (3:30)

| # | Time | Screen | Action | Say |
|---|---|---|---|---|
| 1 | 0:00–0:18 | Slide 1 (title), then Dashboard (empty) | Show the title for 3 s, switch to the app | "Merchants handle 'I was charged twice' tickets by hand, because a refund bot that can be talked into the wrong refund costs real money. JARVIS Automations is a commerce operations agent where AI proposes, policy decides, and every refund is verified." |
| 2 | 0:18–0:35 | Dashboard, header chips | Point at the status chips | "This is the merchant workspace. The status bar says exactly what is running: the API, the AI model, and that payments are simulated. Nothing is recorded yet; everything you'll see comes from real backend cases." Mode A: "The AI here is DeepSeek-V4-Flash, served by AMD's hosted inference." |
| 3 | 0:35–1:10 | Demo store → order **#48291** | *Request a refund* → send. Wait for the reply | "A customer was charged twice for order 48291. The AI reads the message and proposes a refund, but it has no authority. Deterministic policy checks the records, approves exactly the duplicate charge, the simulated gateway executes it, and a read-back verifies it. Only then is the customer told: refund of 89.99 issued." |
| 4 | 1:10–1:40 | Demo store → order **#48294** | Send | "This message claims a 5,000 dollar charge and tries to inject a 'system notice' to force a refund. The AI may still propose one, but the evidence contradicts the records, so policy denies it. Escalated to a person, zero dollars moved, and the customer is told a person will review it." |
| 5 | 1:40–1:55 | Demo store → order **#48293** | Send | "This order was already refunded. JARVIS closes it with no action: no second refund, ever." |
| 6 | 1:55–2:25 | Orders → #48291 → case evidence / Audit trail | Open the case, scroll the audit | "Here is the proof chain: AI understanding, evidence, the AI proposal, the policy evaluation, a revalidation right before execution, the gateway call, and the read-back. Every step is an audit event." Mode A: point at an AI-call event showing `vllm:DeepSeek-V4-Flash` and its latency. |
| 7 | 2:25–2:45 | Support inbox → #48294, then Approvals | Open the escalated conversation | "The inbox shows what the customer actually saw, and the Copilot shows why JARVIS refused: the failed check and the policy section. Escalations land in a review-only queue; JARVIS can't approve its own escalations." |
| 8 | 2:45–3:10 | Slide 8 (evaluation), then AI provider page | Show the slide 5 s, then the provider page | "On our pinned 30-case adversarial benchmark, run on the live AMD model, JARVIS made zero unsafe autonomous actions and 20 of 20 correct escalations. Every miss failed safe, to a person." |
| 9 | 3:10–3:30 | Slide 10 (closing) | Hold | "AI proposes. Policy decides. Every refund is verified. Today it's one automation on simulated payments; the same pattern extends to chargebacks and partial refunds, and to self-hosted models on AMD GPUs." |

## Do not say

- "Real refunds", "revenue" or any time or cost saving: none were measured.
- "Running on AMD GPUs we host" or "vLLM on AMD Developer Cloud": not deployed.
- "Connected to Evolus".
- In Mode B: "running on AMD right now".

## After recording

1. Watch the whole file once with sound. Check: no key, no terminal with secrets, no browser tabs or notifications visible.
2. Trim dead time; keep every result screen.
3. Export MP4, H.264, 1080p. Name it `jarvis-demo.mp4` and put it in `docs/submission/` (the folder is in the repo; **do not commit a large video** unless you decide to).
4. Stop the API window with Ctrl+C (Mode A clears the variables automatically). Close all PowerShell windows.
