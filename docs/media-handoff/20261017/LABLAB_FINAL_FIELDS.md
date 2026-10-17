# lablab.ai update: exact fields (NOT applied; owner approval required)

Current public record, read 17 Oct 2026 from https://lablab.ai/submissions/lp1nzpneomsafp3lv6rjp220:

- Track: Reinvent Commerce only. No "Agent Builder / INTERNET OF AGENTS" association is shown on the public record.
- Technologies: Vercel, rest api, Claude Code, ChatGPT, Cursor, AMD Developer Cloud. "DeepSeek V3" is **not** on JARVIS (it appears on another team's card on the same page).
- Demo URL: `…/#/command-center` (change needed).
- Long description says "integrates with AMD **Token Factory-hosted** DeepSeek-V4-Flash" (over-claim: the endpoint is not confirmed as Token Factory) and lists three scenarios.

Field length limits could not be read without signing in to the edit form; the short description below is 212 characters, below the current one (222), so it fits whatever limit the current one fits.

## Title
JARVIS Automations

## Short description (212 chars)
AI proposes, deterministic policy decides, every refund is verified. JARVIS resolves duplicate-charge tickets with simulated, read-back-verified refunds and escalates anything unsafe or contradictory to a person.

## Demo URL
https://jarvis-actiii-preview.vercel.app/#/judge

## Repository URL (unchanged)
https://github.com/ascendlevelup18-byte/jarvisACTIII

## Technologies
Keep: Vercel, rest api, AMD Developer Cloud (the 14 Oct run used an AMD-hosted endpoint; it is not a self-hosted GPU claim).
Add if the picker offers it: DeepSeek-V4-Flash (or the closest DeepSeek entry that is not "V3"), TypeScript, React.
Optional to remove: Claude Code, ChatGPT, Cursor (development tools, not runtime); keep them if you want to credit the tooling.

## Long description

**Demo:** https://jarvis-actiii-preview.vercel.app/#/judge (Judge Mode, no login)
**Repository:** https://github.com/ascendlevelup18-byte/jarvisACTIII · every claim is mapped to its evidence in CLAIMS.md

**The problem.** Duplicate-charge complaints move money. When AI controls refund actions without deterministic safeguards, it can be talked into refunding the wrong charge, refunding twice, or paying whatever amount a customer types.

**The solution.** JARVIS separates AI proposals from authorization. The model (DeepSeek-V4-Flash) reads the complaint and proposes a structured decision. Deterministic code derives the amount from payment records, checks policy and permissions, revalidates state, executes only an allowed, idempotent simulated refund, reads it back to verify it, and audits every step. Unsafe or contradictory requests go to a person.

**Judge Mode.** One button runs four synthetic scenarios against the public demo: a duplicate $89.99 charge refunded and verified; a prompt-injected $5,000 demand denied and escalated with $0 moved; an already-refunded order closed with no second refund; and a $250 claim against a $180 charge escalated with nothing executed. "Inspect why" opens each case's policy checks and audit chain.

**Why the policy layer matters.** On 30 pinned synthetic cases, executing the same proposals without the policy layer gives 18 unsafe outcomes and 11 unauthorized counterfactual refunds; with JARVIS's policy, zero were observed. This comparison used a simple offline test proposer, not the live AMD model, and no baseline refund moved money.

**AMD.** On 14 October 2026 JARVIS ran end to end on an AMD-hosted DeepSeek-V4-Flash endpoint: 17/17 live demo checks, and on the 30-case benchmark 26/30 exact outcomes, 20/20 correct escalations under the benchmark definition, and zero observed unsafe autonomous actions. Two benchmark cases used scripted decision outputs. Judge Mode replays that recorded run and labels it recorded, not live. No self-hosted GPU or ROCm inference is claimed, and the endpoint has not been independently confirmed as the Token Factory portal.

**Engineering.** Racing duplicate requests produce one refund; dishonest read-backs never resolve; request bodies are capped at 64 KiB. 323 API tests, 89 web tests, four browser suites and a CI gate that fails on any unsafe action.

**Limitations.** The public demo uses fixture AI, synthetic data and simulated payments. One automation (duplicate-charge refunds) is working; there is no real merchant deployment, and no customers or savings are claimed.

**AI proposes. Policy decides. Every refund is verified.**

## Media fields (after Work delivers)
- Video: replace with Work's new reviewed MP4.
- Slides: replace with Work's new PDF.
- Cover: optional, from `screenshots/01-judge-hero-1920x1080.png` or Work's cover.

## Steps to apply (owner, or Claude after "approve lablab")
1. Open the submission edit page on lablab.ai while signed in.
2. Paste the short and long descriptions; set the demo URL to `#/judge`.
3. Adjust technologies as above.
4. Upload the new video and slides once Work has them.
5. Save, then open the public page signed out and check: demo link opens Judge Mode, text has no "Token Factory-hosted", video plays, slides open.
