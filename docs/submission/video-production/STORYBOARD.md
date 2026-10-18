# Storyboard, narration and edit sequence (target 3:40)

Check the official length limit on the live lablab.ai "What to Submit" section first; if it is 3:00, drop scenes 8 and 9b as marked.

Footage key: **P** = PRODUCT (real recording, see `FOOTAGE_AND_ASSETS.md`), **V** = VISUAL (Blender/Gemini illustration, see `BLENDER_SHOT_LIST.md`), **S** = slide from `docs/submission/deck/jarvis-deck.pdf`.

| # | Time | Scene | Footage | Picture | Narration | On-screen text |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:12 | Identity | V (B1) | JARVIS wordmark resolves from a stream of order cards; one card flags "charged twice" | "Every day, online merchants get the same message: 'I was charged twice.'" | JARVIS Automations |
| 2 | 0:12–0:30 | Problem | V (B2) | Two identical charge tiles; a refund arrow hesitates between them; a third "$5,000" tile tries to push in | "It's repetitive work, but mistakes move real money. Refund the wrong charge, refund twice, or trust a number a customer typed, and it's gone. An AI agent with a refund button can be talked into all three." | Repetitive · risky · easy to manipulate |
| 3 | 0:30–0:48 | Product reveal | P (R1) | Real merchant dashboard, slow pan; header status chips in focus | "JARVIS Automations is a merchant operations workspace with one firm rule: AI proposes, policy decides, and every refund is verified." | Live product footage · Simulated payments |
| 4 | 0:48–1:05 | Agent workflow | V (B4) | Seven-stage pipeline lights in order: Understand → Evidence → Propose → Policy → Revalidate → Execute → Verify. AI stages glow violet, code stages teal | "The model reads the case and proposes. Everything with authority is deterministic code: the amount comes from the records, policy checks it, state is revalidated, the gateway executes, and a read-back verifies it." | AI proposes · Code decides · Results verified |
| 5 | 1:05–1:35 | Authorized refund #48291 | P (R2, R3) | Demo store: send #48291; reply "Refund of $89.99 issued"; then the case evidence with the audit trail | "Order 48291 was charged twice. The AI proposes refunding the duplicate. Policy approves exactly that charge, the simulated gateway refunds it, and only after read-back does the customer hear it's done." | RESOLVED · $89.99 · simulated · verified |
| 6 | 1:35–2:00 | Unsafe request blocked #48294 | P (R4) + V (B5) | Store: send #48294; ESCALATED. Cut to B5: a shield closing over a "$5,000" tile, labelled Illustration | "This customer claims a 5,000 dollar charge and tries to slip in a fake system notice. The records don't support it, so policy denies it. Escalated to a person. Zero dollars moved." | ESCALATED · $0 moved |
| 7 | 2:00–2:15 | Duplicate prevented #48293 | P (R5) | Store: send #48293; CLOSED_NO_ACTION | "Order 48293 was already refunded. JARVIS closes it with no action. No second refund, ever." | CLOSED_NO_ACTION · no second refund |
| 8 | 2:15–2:35 | Audit and approvals (cut if 3:00) | P (R6) | Audit trail filtered by case; review-only approvals queue | "Every AI call, policy check, gateway call and verification is in the audit trail. Escalations wait for a person; JARVIS can't approve its own." | Every step audited |
| 9 | 2:35–3:00 | AMD inference | P (R7) + V (B6) | R7: live API terminal "listening" line and the header chip showing the live model (recorded with the live key, Mode A). B6: request packets flowing to an "AMD hosted inference" node and back | "The reasoning runs on DeepSeek-V4-Flash through AMD's hosted inference API. Startup refuses to serve unless the model passes schema checks, and there is no silent fallback." | DeepSeek-V4-Flash · AMD hosted inference |
| 9b | 3:00–3:15 | Architecture (cut if 3:00) | S (slide 9) or V (B7) | Stack overview | "One provider-portable adapter: today AMD's hosted API, next self-hosted models on AMD GPUs." | Illustration (if B7) |
| 10 | 3:15–3:30 | Evidence | S (slide 8) | Benchmark numbers | "On a pinned 30-case adversarial benchmark run on the live AMD model: zero unsafe actions and 20 of 20 correct escalations. Every miss went to a person." | 0 unsafe · 20/20 escalations · 26/30 passed |
| 11 | 3:30–3:40 | Close | V (B8) | Wordmark and tagline | "JARVIS. AI proposes. Policy decides. Every refund is verified." | AI proposes. Policy decides. Every refund is verified. |

## Final edit sequence (timeline)

```
00:00 V-B1  identity                     12s
00:12 V-B2  problem                      18s
00:30 P-R1  dashboard reveal             18s
00:48 V-B4  pipeline                     17s
01:05 P-R2  #48291 store  → P-R3 evidence 30s
01:35 P-R4  #48294 store  → V-B5 shield  25s
02:00 P-R5  #48293 store                 15s
02:15 P-R6  audit + approvals            20s   (cut for 3:00)
02:35 P-R7  live model chip + V-B6       25s
03:00 S-9   architecture                 15s   (cut for 3:00)
03:15 S-8   evidence                     15s
03:30 V-B8  close                        10s
03:40 end
```

Audio: one narration track (record clean, -16 LUFS), quiet music bed ducked under voice, no sound effects over product results. Export 1920×1080, 30 fps, H.264 MP4.

## Cinematic vs actual footage

- Scenes 3, 5, 6 (first half), 7, 8 and 9 (first half) are **real recordings** and carry "Live product footage".
- Scenes 1, 2, 4, 6 (second half), 9 (second half), 9b (if B7) and 11 are **illustrations** and carry "Illustration".
- Never composite real UI into a Blender scene in a way that changes what it shows. Never animate a fake JARVIS screen.
