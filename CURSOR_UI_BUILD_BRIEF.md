# JARVIS UI PHASE

Inspect the real implementation first.

Read:

- `docs/JARVIS_ACT_III_BUILD_CONTRACT.md`
- `docs/JARVIS_AI_TEAM_OPERATING_SYSTEM.md`
- `docs/IMPLEMENTATION_STATUS.md`
- the current `apps/api` contracts
- the current `POST /cases` response shape (see `CURSOR_START_HERE.md`)

**Backend checkpoint:** `1beaef1`

**The backend is frozen.**

## GOAL

Build the first polished JARVIS Case Workspace UI against the existing fixture API.

This is the presentation layer for the working backend.

Do not add:

- AMD integration
- Evolus integration
- a database
- authentication
- billing
- new business workflows
- backend feature changes
- speculative abstractions

If the existing API genuinely blocks the UI, stop and report the exact contract problem before modifying backend code.

## PRODUCT PRINCIPLE

**JARVIS must NOT look like a chatbot.**

The interface should make this chain immediately understandable:

```
CUSTOMER CASE
→ STRUCTURED UNDERSTANDING
→ EVIDENCE
→ AI PROPOSAL
→ DETERMINISTIC POLICY
→ AUTHORIZATION
→ EXECUTION
→ VERIFICATION
```

The unsafe or ambiguous path:

```
CASE
→ CONFLICT / UNSUPPORTED INTENT / INCOMPLETE EVIDENCE
→ ACTION BLOCKED
→ ESCALATED
```

## PRIMARY SCREEN

Build a professional, desktop-first **Case Workspace**.

### Context

Show:

- customer message
- order ID
- customer ID
- case state
- scenario/status

### Operational Flow

Show the actual progression:

1. Received
2. Extracting
3. Evidence Gathering
4. Analyzing
5. Decision Proposed
6. Policy Validation
7. Approved / Escalated
8. Executing
9. Verifying
10. Resolved / Failed / Closed No Action

Use real audit and state information wherever possible.

### Structured Understanding

Use `understanding`. Show the interpreted intent and the financial information the customer stated.

### Intent Cross-Check

Use `evidence.intentCues`. This is deterministic corroboration, and it must stay visually separate from the AI understanding.

### Evidence

Use `evidence`. Show:

- order and payment facts
- duplicate evidence
- financial state
- ownership/status evidence
- contradictions

### AI Proposal

Use `proposal`. Label it clearly: **AI PROPOSAL**.

The AI must not visually appear to possess execution authority.

### Deterministic Policy Authorization

Use `authorization.checks` and `authorization.outcome`. Show every check as:

- pass
- fail
- reason

This is one of the most important surfaces in the entire product. Make it visually obvious:

**AI proposes. POLICY authorizes.**

### Execution

Use `action`. Show:

- the action
- its target
- the amount, where applicable
- the provider outcome
- the execution status

### Verification

Use `verification`. Show:

- the read-back status
- the verified outcome
- the post-action result

### Escalation / Failure

Use `reasons` for the human-readable explanation.

### Audit Timeline

Use `audit`. Render state transitions and meaningful events in chronological order.

## VISUAL DIRECTION

The product should feel like:

- serious operations software
- an AI control plane
- a financial exception workspace

It should NOT feel like:

- a chatbot
- a sci-fi HUD
- a crypto dashboard
- a generic admin template
- a giant gradient startup landing page

Use:

- restrained typography
- excellent spacing
- clear visual hierarchy
- subtle borders
- high information density without clutter
- clean status indicators
- professional enterprise product design

The strongest visual distinction should be **AI PROPOSAL** versus **DETERMINISTIC AUTHORIZATION**.

## DEMO CASES

Make these easy to trigger and view. The exact request bodies are in `CURSOR_START_HERE.md`.

| # | Case | Expected visible outcome |
|---|---|---|
| 1 | Valid duplicate charge | `RESOLVED` |
| 2 | Conflicting amount | `ACTION BLOCKED / ESCALATED` |
| 3 | Already refunded | `CLOSED_NO_ACTION` |
| 4 | Prompt-injection / adversarial case | `ACTION BLOCKED / ESCALATED` |

**Never fake states. Use the real API.**

## FIRST UI SCOPE

Build only:

- the application shell
- the case selector/input
- the case workspace
- the operational state flow
- understanding
- evidence
- AI proposal
- policy authorization
- execution
- verification
- escalation
- the audit timeline

Do not build yet:

- analytics
- a benchmark dashboard
- settings
- auth
- onboarding
- new workflows
- mobile-specific UI

## KNOWN API CONSTRAINTS (from the handoff; do not change the backend for these)

- **No CORS headers, and OPTIONS is not handled.** Serve the UI through a same-origin dev proxy for `/cases`.
- **The response contains only the final case.** Show the operational flow by replaying `audit`, and label it as such. There is no live progress stream.
- **Fixture state is in memory.** Re-submitting the valid duplicate returns `CLOSED_NO_ACTION`, because it was already refunded. Restart `npm run api:start` to reset the demo.
- **Render policy from `authorization.checks`.** Never parse `reasons` strings to reconstruct policy state.

## CURSOR PROCESS

Before editing:

1. Inspect the available project.
2. State the current frontend status.
3. State the UI framework/stack you chose, based on the existing repo.
4. List the exact files you will create or modify.

Then implement.

After implementation, verify:

- the frontend typecheck
- frontend tests, if present
- the production frontend build
- that backend tests remain green (`npm run api:test`)
- that the backend benchmark CI remains green (`npm run api:bench:ci`)
- a local UI smoke test against the actual `POST /cases`

Report:

- IMPLEMENTED
- UI STRUCTURE
- FILES CHANGED
- VERIFIED
- BACKEND UNCHANGED? YES / NO, with evidence
- KNOWN UX GAPS
- VISUAL DESCRIPTION
- NEXT RECOMMENDED UI PASS

**Do not proceed into AMD/Evolus integration.**
