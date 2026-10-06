# AMD Deployment Runbook (skeleton)

> **Status:** PROPOSED / scaffold only. No live AMD endpoint, ROCm, or vLLM deployment is wired in this pre-kickoff build.

## Purpose

Checklist for connecting JARVIS `apps/api` to an AMD Developer Cloud (or similar) OpenAI-compatible vLLM endpoint after kickoff adapters land.

## Prerequisites (kickoff+)

- [ ] AMD Developer Cloud (or MI300X) instance with ROCm
- [ ] vLLM serving an open model with an OpenAI-compatible `/v1` API
- [ ] Network path from the JARVIS API host to the vLLM base URL
- [ ] Optional API key if the server was started with `--api-key`
- [ ] `VllmRequestUnderstandingAdapter` + `VllmModelAdapter` implemented and verified

## Environment

See `apps/api/.env.example`:

```bash
JARVIS_AI_MODE=vllm
JARVIS_MODEL_BASE_URL=http://<mi300x-host>:8000/v1
JARVIS_MODEL_NAME=<served-model-name>
# JARVIS_MODEL_API_KEY=<optional>
JARVIS_MODEL_TIMEOUT_MS=30000
```

**Pre-kickoff note:** setting `JARVIS_AI_MODE=vllm` today causes startup to refuse. That is intentional — there is no silent fixture fallback.

## Suggested bring-up order (after adapters)

1. Confirm vLLM health: `GET {baseUrl}/models` (or equivalent).
2. Smoke the generic client against the endpoint (no JARVIS prompts).
3. Enable understanding adapter only; compare structured-request parse rates to fixture.
4. Enable decision adapter; run `npm run api:bench` (not CI pin) and review unsafe rate.
5. Only then consider Evolus / public demos / latency measurement.

## Out of scope for this scaffold

- Real AMD endpoint calls
- Live vLLM integration
- Real-model benchmark
- Evolus extractor / knowledge library
- Docker/ROCm image authorship beyond existing legacy reference

## Rollback

Set `JARVIS_AI_MODE=fixture` and restart. Fixture adapters remain the supported path until kickoff verification.
