# Netlify deployment status

## Implemented in this package

- Netlify build configuration
- React SPA hosting
- `/cases` -> Netlify Function routing
- `/api/health` truth/status endpoint
- server-side execution of the existing JARVIS fixture demo path
- isolated synthetic store per public request
- no frontend secrets
- SPA fallback

## Preserved

The existing core JARVIS files are not rewritten by this deployment adaptation. The function imports and runs the existing contracts, case engine, fixtures, gateway, model adapter, request-understanding adapter, and policy configuration.

## Not implemented / not claimed

- real AMD Developer Cloud model inference
- real vLLM adapters
- Evolus integration
- production payment processor
- durable production database/state

This package is for the current pre-kickoff public demo only.
