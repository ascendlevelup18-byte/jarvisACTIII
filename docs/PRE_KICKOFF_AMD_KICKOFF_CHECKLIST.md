# Pre-kickoff → Kickoff Implementation Checklist

Use this after the AMD scaffold freeze. Items below are **NOT** implemented in the pre-kickoff build.

## Adapters (required for `JARVIS_AI_MODE=vllm`)

- [ ] `VllmRequestUnderstandingAdapter` implementing `RequestUnderstandingAdapter`
- [ ] `VllmModelAdapter` implementing `ModelAdapter`
- [ ] Wire adapters in `apps/api/src/main.ts` when mode is vllm (replace startup refuse)
- [ ] Keep fixture path intact; **never** silently fall back to fixture when mode is vllm

## Prompts & mapping

- [ ] JARVIS understanding prompt (intent + mentioned amounts) — untrusted message as data only
- [ ] JARVIS decision prompt (proposal schema) — untrusted message as data only
- [ ] Schema-to-model mapping / structured-output options as needed by the served model
- [ ] Use `cleanupModelContent` then existing `parseStructuredRequest` / `parseProposal` (do not trust raw text)

## Provider usage

- [ ] Call `OpenAICompatibleClient` only through adapters (no business logic in the client)
- [ ] Map `ProviderError` categories into case `FAILED` / audit reasons without leaking secrets
- [ ] Respect `JARVIS_MODEL_TIMEOUT_MS` and AbortSignal already used by the case engine

## Verification before claiming “AMD ready”

- [ ] `npm run api:typecheck` / `api:test` / `api:bench:ci` still green on fixture
- [ ] New adapter unit tests against the fake OpenAI server
- [ ] Controlled live smoke against the AMD endpoint (not CI by default)
- [ ] Real-model benchmark run (separate from BASELINE-V1 fixture pin)
- [ ] Document unsafe / escalation deltas vs fixture baseline

## Explicitly deferred

- [ ] Evolus integration
- [ ] Streaming / tool-calling / agent loop
- [ ] LangChain / LangGraph / OpenAI SDK (prefer native fetch client already scaffolded)
- [ ] Public marketing numbers from fixture benchmark
