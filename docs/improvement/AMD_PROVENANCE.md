# AMD provenance: what ran where, and what the evidence proves

Every statement below is tied to a committed file. "Shown" means the file records it; "not shown" means no evidence exists.

## The endpoint

| Question | Answer | Evidence |
|---|---|---|
| Which endpoint served the live run? | `https://developer.amd.com.cn/radeon/api/v1`, OpenAI-compatible | `evals/results/amd-live-001.json`, `live-gate-20261014T201902Z.json` |
| Where did that URL come from? | The owner's hackathon API documentation (protocol V3) | `amd-live-001.json` → `provider` |
| Is it the hackathon "Token Factory" portal? | **Not independently confirmed by JARVIS evidence.** It authenticated the owner's hackathon key format (`rc-…`), listed 12 models, and served completions. A separate ACT III entry (CertGate) publicly describes its Token Factory endpoint as the same host. That is an outside observation, not proof. | `amd-live-001.json`; CertGate README (public) |
| Hardware behind it | **Not shown.** A hosted API does not expose GPU model, ROCm or vLLM versions to the client. JARVIS claims no GPU, ROCm or self-hosted inference. | `docs/AMD_EVIDENCE.md` §2 |
| Limits | 20 requests/min and $1/day for the key, from response headers | `amd-live-001.json` → `rate_limit_headers` |

## The model

| Question | Answer | Evidence |
|---|---|---|
| Model requested | `DeepSeek-V4-Flash` | `live-gate-20261014T201902Z.json` |
| Model reported by the provider | `self-dploy/DeepSeek-V4-Flash` (gateway-prefixed) | `amd-live-001.json` → `model_returned` |
| Protection against a silent swap | Startup refuses unless the model is listed and both schema probes pass. Every reply must report the configured id exactly, or `<prefix>/<id>`; otherwise the case fails closed. | `apps/api/src/ai-mode.ts` (`servedModelMatches`), `engine-hardening.test.ts` |
| Structured output | `json_object`, validated by JARVIS's own Zod schemas | `live-gate-*.json`, `apps/api/src/ai-config.ts` |
| Prompt versions | understanding `261775…ccec`, decision `e7b626…3f26` (SHA-256 of the prompt text) | `duplicate-charge-eval…tf-1.json` → `run.promptVersions` |

## What runs on AMD, and what runs locally

| Step | Where | Notes |
|---|---|---|
| Understanding (intent + stated amounts) | AMD-hosted model in live mode; fixture adapter in the public demo | 1 call per case |
| Decision proposal | AMD-hosted model in live mode; fixture adapter in the public demo | 1 call per case |
| Evidence, policy, revalidation, money arithmetic, gateway, read-back, audit | Local deterministic TypeScript, always | The model has no authority in any of these |

## Measured performance (14 Oct 2026, run `tf-1`)

| Metric | Value | Source |
|---|---|---|
| First live call | HTTP 200 in 1,592 ms, 10 + 14 tokens | `amd-live-001.json` |
| Startup (listing + 2 probes) | 19.4 s | `live-gate-20261014T201902Z.json` |
| Understanding latency p50 / p95 / max | 2.0 s / 18.7 s / 30.0 s (one timeout at the 30 s limit) | benchmark `telemetry.latencyMs` |
| Decision latency p50 / p95 / max | 8.9 s / 24.0 s / 28.8 s | same |
| Benchmark wall time | 7.6 minutes for 30 cases | `run.startedAt` → `run.finishedAt` |
| Outcomes | 26/30 exact; 20/20 required escalations; 0 unsafe; 7/10 autonomous cases resolved | benchmark `metrics` |

Caveats that travel with these numbers: two cases (DC-E02, DC-E03) use scripted decision output; the run used uncommitted changes on top of `55be4ab`; the cases are synthetic.

## Credential handling

The key is typed at a hidden PowerShell prompt (`scripts/live-gate.ps1`), held only in process environment, cleared on exit, and followed by a leak scan of the run's files (`keyLeakFiles: 0`). It is never in the repository, the browser bundle, or the Vercel project. One exposure in local shell history (14 Oct) is recorded in `SECURITY_REVIEW.md` as C-1; the key is treated as compromised.

## Not done (stretch)

Self-hosted vLLM on an AMD Developer Cloud MI300X (`docs/AMD_DEPLOYMENT_RUNBOOK.md`, status "not yet executed"). The adapter already speaks the vLLM API, so the change is configuration plus a GPU instance. It would add hardware identity (`rocm-smi`), ROCm and vLLM versions, and throughput to this page. It needs GPU access and a time window that does not risk the working demo.
