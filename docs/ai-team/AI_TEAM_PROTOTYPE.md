# JARVIS AI Executive Team — prototype (feature branch, not released)

**Status:** working prototype on `feature/jarvis-ai-executive-team`, built on the product-excellence branch (`f8da504`). Not merged, not deployed, not part of the ACT III submission.
**What runs today:** deterministic **fixture specialists** (rules over a **synthetic** store dataset). **No language model is called.** Every screen says so.

## Launch locally
```
npm ci
npm ci --prefix apps/web
npm run api:start      # terminal 1 (the AI Team itself makes no API calls; the shell needs the API)
npm run web:dev        # terminal 2
```
Open http://127.0.0.1:43123/#/ai-team. Tests: `npm run web:test`; browser suite (needs playwright-core and Chrome, as the other suites): `node apps/web/e2e/ai-team.e2e.mjs`.

## What it does
- **Executive directory:** CEO, CFO, Sales Director, CMO, COO, HR Director. Each has a versioned role (`cfo@1.0.0`), responsibilities, the metrics it may see, read-only tools and a boundary statement.
- **Private chats:** one thread per specialist, stored only in this browser (`localStorage` key `jarvis.team.v1`), single local user. Ordered by sequence number, capped at 60 messages and 1,200 characters each, exportable as JSON, deletable after a confirm. Nothing leaves a thread unless the owner presses "Share to boardroom" on that message.
- **Executive boardroom:** the owner states a problem; the orchestrator routes it, runs the selected specialists once each, validates their structured output, finds disagreements, and produces one report: diagnosis (measured), hypotheses, disagreements, ordered actions (each awaiting owner approval), expected impact with assumptions, risks, 30-day plan, human decisions, missing information, evidence table and audit trail. Approving an action records a decision; JARVIS executes nothing.

## Orchestration (`apps/web/src/team/orchestrator.ts`)
request → keyword topics → specialist selection (max 5 + CEO) → scoped context (role's metrics and tools only, plus owner-shared notes) → one call per specialist with a per-call timeout and cancellation → `SpecialistOutput` schema validation (zod), role check, output-size budget, tool allowlist → conflict detection (same lever, opposite directions) → deterministic synthesis → plan with `requiresApproval: true` on every action → numbered audit. No specialist calls another; there is no loop.
Budgets: 5 specialists + CEO, 6 calls, 15 s per call, 8,000 characters of output per specialist (a live adapter would enforce tokens and cost instead).

## Provider design (`apps/web/src/team/provider.ts`)
`TeamProvider { info; analyze(agent, task, context, signal); reply(...) }`. Implemented: `FixtureTeamProvider` (labelled `fixture`). Designed, not built: a **server-side** OpenAI-compatible adapter for AMD-hosted inference, a local server or another provider, reading its key from server environment variables only, sending each specialist only its scoped context with the JSON schema, and returning raw text for the same validation path. Each result reports provider, model requested/returned, latency, tokens and cost where known. The historical AMD key is compromised and must not be reused; no live adapter is wired, and none should be until a new key and a spend limit are approved.

## Synthetic data and calculations (`apps/web/src/team/dataset.ts`, `metrics.ts`)
Six monthly records (Apr–Sep 2026) for a fictional store. Fourteen metrics with stated formulas (net revenue, conversion, gross margin, refund rate, refunds share of sales, defect share, late shipments, CSAT, first response, tickets per agent, cost per new customer, repeat-order share, marketing spend). Two tools: a **margin bridge** (refunds explain 2.76 of the 5.86 margin points lost, holding April's refund share) and **support capacity** (stated assumption: 24 min per ticket, 130 productive h per FTE). Every finding cites metric keys and record ids.

## Security and permission model
- Specialists only propose. Tools are read-only (`read_metrics`, `margin_bridge`, `support_capacity`); any other tool request is dropped and audited.
- No network calls from the team code, no credentials, no writes to the JARVIS API (the browser suite asserts zero POST/PUT/DELETE).
- Private chats are isolated per agent; the boardroom receives only explicitly shared messages.
- HR proposes capacity and training options only; no individual employment decisions or personal inferences.
- Not implemented and not claimed: authentication, multi-user collaboration, encryption, server persistence, tenant isolation.

## Verified
Web unit tests 130/130 (20 for the AI Team: routing, scoping, citations, schema rejection, wrong-role and oversized output, tool allowlist, call budget, timeout, failure, cancellation, no loop, deterministic replay, arithmetic, margin bridge, chat isolation and ordering, explicit sharing, caps, export, delete, defensive parsing, no secrets). Browser suite 11/11 (labels, directory, chat with evidence and reload persistence, isolation, boardroom report and conflict, approval audit, cancel, keyboard, no API writes, 375 px, no console errors). All existing JARVIS suites unchanged: API 323/323, legacy 58/58, benchmark 0 unsafe, baseline 18/11, verifier 21/21, Judge Mode 12/12, reliability 6/6, older suites 8/8, 8/8, 16/16.

## Limitations
Fixture rules, not reasoning; keyword routing; synthetic data; one local user; no live model; the boardroom's "debate" is a deterministic conflict check plus a fixed CEO resolution; the 30-day plan template is fixed.

## Roadmap
1. Server-side live adapter behind an explicit flag, per-request spend cap, rate limits in a shared store; AMD-hosted first, then local OpenAI-compatible servers.
2. Model-proposed analyses validated against the same schema, with every number recomputed by the deterministic metrics before display (model text cannot introduce figures).
3. Real data connectors (commerce platform, helpdesk, ads, payroll aggregates) with per-role scopes.
4. Authentication, shared boardroom with real human participants, server persistence with retention controls.
5. Approval workflow that hands approved actions to controlled automations (the JARVIS refund pattern), never direct execution by a specialist.
