# JARVIS — Netlify Deployment Guide

Package: `JARVIS_ACTIII_FINAL_PREKICKOFF` (accepted product `6afb019`).

## What this package deploys

This package deploys the **current pre-kickoff JARVIS fixture/demo build** as a genuinely interactive web application:

- React/Vite UX V3 Operations UI on Netlify CDN
- `POST /cases` routed to a Netlify Function
- the existing JARVIS case engine, evidence logic, deterministic policy/permission checks, simulated gateway, verification, state transitions, and audit trail
- fixture request-understanding and fixture model adapters
- synthetic commerce data only

It does **not** claim or use real AMD/vLLM/Evolus inference.

## Deployment architecture (verified wiring)

```text
Browser
  -> Netlify React frontend (SPA)
  -> POST /cases
  -> Netlify Function (netlify/functions/cases.ts)
  -> JARVIS case engine (apps/api imports — no duplicated business logic)
  -> fixture understanding + fixture proposal
  -> deterministic policy / permission checks
  -> simulated payment gateway
  -> verification
  -> audit trail
  -> JSON result back to UI
```

Health:

```text
Browser -> GET /api/health -> netlify/functions/health.ts
  -> truth labels: fixture / synthetic / simulated / remoteModel: false
```

Each public demo request gets a fresh synthetic fixture store. This prevents one visitor's simulated refund from changing another visitor's demo while preserving the real JARVIS case-engine path inside that request.

## Deploy from Netlify UI

1. Put this folder in a GitHub repository (recommended) or use Netlify's supported project import flow.
2. In Netlify choose **Add new project / Import an existing project**.
3. Select the repository.
4. Netlify should detect `netlify.toml` automatically.
5. Confirm:
   - Build command: `npm ci --prefix apps/web && npm run web:build`
   - Publish directory: `apps/web/dist`
   - Functions directory: `netlify/functions`
   - Node version: `24`
6. Deploy.
7. After deployment, open:
   - `/api/health`
   - the site root `/`
8. Run all four demo scenarios in the UI.

## Environment variables

For the current fixture demo, no secrets are required.

Do **not** set `JARVIS_AI_MODE=vllm` in this package. The pre-kickoff code intentionally refuses real vLLM mode because those adapters are not implemented yet.

During ACT III, after the real adapters are implemented and verified, the server-side deployment can use variables such as:

- `JARVIS_AI_MODE=vllm`
- `JARVIS_MODEL_BASE_URL=...`
- `JARVIS_MODEL_NAME=...`
- `JARVIS_MODEL_API_KEY=...`

Those values must stay server-side. Never expose the API key through a `VITE_*` frontend variable.

## Routes

- `GET /api/health` — deployment truth/status endpoint
- `POST /cases` — JARVIS case resolution endpoint
- `/*` — React SPA fallback

## Expected health response

```json
{
  "ok": true,
  "service": "jarvis",
  "deployment": "netlify",
  "aiMode": "fixture",
  "data": "synthetic",
  "paymentGateway": "simulated",
  "remoteModel": false
}
```

## Important truth boundary

This deployment is a working **pre-kickoff prototype**, not the final AMD competition build.

Truth labels for pitches and UI copy:

- **fixture** AI mode
- **simulated** payment gateway
- **synthetic** data
- **AMD not connected**

Current fixture benchmark numbers must not be presented as real AMD-model numbers.

## Compatibility note

Netlify wiring was merged and verified in the UX V3 product report on `6afb019` (functions import existing API modules; core engine unchanged). Re-verify health + four demos after any fresh Netlify deploy from this folder.
