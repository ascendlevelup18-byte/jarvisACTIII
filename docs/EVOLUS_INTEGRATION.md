# Evolus integration: verified requirements, design boundary, blockers

**Status: NOT STARTED (no access).** No Evolus code exists. Nothing here claims a working integration.

## 14 Oct 2026: requirements read directly from the event page

Read from https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii ("Track by partner: Evolus"):
- Build in a free Evolus event workspace, created at app.evolus.ai with the event code shared at kickoff.
- "The main agent must use an open model served on AMD infrastructure through your own vLLM endpoint on AMD Developer Cloud."
- Use at least two building blocks: workflows, document extractors, AI Tools, knowledge libraries, MCP connectors, sub-agents, chat widget.
- Drive Evolus through its REST API (workflows, extractors, AI Tools, libraries) or its OpenAI-compatible endpoint for agent chat.
- Containerized app, public GitHub repository, a README that runs. Never commit API keys.
- Partner prizes are optional; a project may qualify for the main challenge prize, one partner prize, or both.

**Consequence for JARVIS:** AMD Token Factory is a hosted API, not "your own vLLM endpoint". So it does **not** meet the Evolus model requirement on its own. Qualifying needs, in addition:
1. an AMD Developer Cloud GPU VM serving an open model with vLLM (the AMD member-perks page offers $100 of Developer Cloud credit through a form, activated by email after verification, expiring 30 days after activation);
2. an event workspace and API access;
3. a container image (the repository has no Dockerfile today);
4. a public repository (it is private today: the unauthenticated GitHub API returns 404).

`https://app.evolus.ai/join/AMDACT3` serves a sign-in app shell; workspace status can only be checked by the owner while signed in. The main AMD submission does not depend on any of this.

## What is known (from public event and partner pages, earlier summary)

**Source caveat:** these points come from web-search summaries of the lablab.ai ACT III page and Evolus's partner blog post. This session's network policy blocks direct access to lablab.ai and evolus.ai. **Re-read both pages directly before building.**

- Teams build in a **free Evolus event workspace**. Access is tied to the event; a generic workspace may not qualify.
- The **main agent must run an open model on AMD infrastructure** through a **vLLM endpoint on AMD Developer Cloud**. A local GPU does not satisfy this.
- Use **at least two Evolus building blocks**: workflows, extractors, AI Tools, knowledge libraries, MCP connectors, sub-agents, or the chat widget.
- Integration is through Evolus's **REST API** (workflows, extractors, AI Tools, libraries), plus an **OpenAI-compatible endpoint** for agent chat.
- Reported limits: 50,000 platform credits per workspace, up to 60 API requests per minute per workspace, and the workspace valid until 2026-11-15. Verify these.

## Not found (needed before any code)

- The Evolus API reference: base URL, auth header and key format, application or workspace id.
- Knowledge Library endpoints: create a library, upload documents, query or retrieve with citations.
- Workflow endpoints: define a workflow, trigger a run with a payload, read the run status.
- The event workspace access procedure and code. It is probably shared at kickoff or in the event Discord.

## Intended JARVIS design (minimum, two building blocks)

1. **Knowledge Library → context only.**
   - Store policy documents and merchant SOPs. Retrieve passages to add explanation and citations to the model's proposal context.
   - **Never** inputs to `authorize()`. Thresholds, amounts and permissions stay deterministic in `policy-engine.ts`.
   - A retrieval failure leaves the case unchanged; at most it records an audit note.
2. **Workflow → escalation hand-off.**
   - After a case reaches `ESCALATED`, a post-terminal step outside the engine triggers an Evolus workflow with the case id, the failed checks and an evidence summary, for a human queue.
   - The workflow performs **no financial action**.
   - A failed trigger is recorded as a failed hand-off and is never reported as delivered. It cannot change the case state.

**Where the code would go:**
- An `apps/api/src/evolus/` client with the same posture as `provider/`: typed errors, timeouts, secrets redacted.
- A hook after `runCase` in the ingress, not inside the frozen engine.
- Tests against a fake Evolus server.
- All of it only once the API reference is in hand.

## Owner actions

1. Get the event workspace link and code from the official event channel, and create the workspace through that link.
2. In the workspace, find the API docs or settings page. Bring back the base URL, auth scheme and endpoint list for libraries and workflows (no secret values in chat; put keys in env only).
3. Confirm with the organisers that the AMD Developer Cloud vLLM endpoint is what counts as the "main agent" model.
