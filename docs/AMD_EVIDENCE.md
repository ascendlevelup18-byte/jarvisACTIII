# AMD inference evidence

**Status: NO REAL-GPU EVIDENCE YET.** Every field marked `UNVERIFIED` is empty on purpose. Fill a field only with output captured from a real run, and paste the command that produced it.

Redact before committing:
- API keys and bearer tokens
- private IPs and hostnames, where sensitive
- any credential in URLs

What *is* verified today (local, no GPU):
- The startup gate, adapters and benchmark runner work against a **fake** OpenAI-compatible server (`apps/api/test/ai-startup.test.ts`, `vllm-adapters.test.ts`, `vllm-benchmark.test.ts`, `ingress-e2e.test.ts`).
- None of those numbers are model or AMD measurements.

## 1. Run identity

| Field | Value |
|---|---|
| Date (UTC) | UNVERIFIED |
| Git commit SHA (`git rev-parse HEAD`) and dirty flag | UNVERIFIED |
| Operator | UNVERIFIED |
| Platform | UNVERIFIED. AMD Developer Cloud, or another approved host. A local RX 6800 must be labelled as a local consumer GPU, not AMD Developer Cloud |

## 2. Hardware and runtime

| Field | Value | Capture with |
|---|---|---|
| GPU model | UNVERIFIED | `rocm-smi --showproductname` |
| GPU memory | UNVERIFIED | `rocm-smi --showmeminfo vram` |
| ROCm version | UNVERIFIED | `cat /opt/rocm/.info/version` or `apt show rocm-libs` |
| vLLM version | UNVERIFIED | `python -c "import vllm; print(vllm.__version__)"` |
| Container image and tag/digest | UNVERIFIED | `docker inspect --format '{{.Config.Image}} {{.Image}}' <container>` |

## 3. Model and server configuration

| Field | Value |
|---|---|
| Model id (`JARVIS_MODEL_NAME`, as listed by `/v1/models`) | UNVERIFIED |
| Model revision (commit hash or tag of the weights) | UNVERIFIED |
| vLLM serve command (key redacted) | UNVERIFIED |
| Max model length, dtype, quantization | UNVERIFIED |
| Structured output: does `response_format: json_schema` work? (`JARVIS_MODEL_STRUCTURED_OUTPUT`) | UNVERIFIED. If `off` is needed, record why |
| Endpoint authentication (`--api-key` set; unauthenticated request rejected) | UNVERIFIED. Capture the 401 from `curl -s -o /dev/null -w '%{http_code}' $BASE/models` without a key |
| Endpoint exposure (private network / tunnel; not public) | UNVERIFIED |

## 4. JARVIS startup gate (real endpoint)

Command:

```bash
JARVIS_AI_MODE=vllm JARVIS_MODEL_BASE_URL=<private /v1> JARVIS_MODEL_NAME=<id> JARVIS_MODEL_API_KEY=<redacted> \
JARVIS_DAILY_MODEL_CALL_BUDGET=200 npm run api:start
```

| Field | Value |
|---|---|
| `[jarvis] ai startup:` line (`modelListed`, `probes`, `promptVersions`, `startupMs`) | UNVERIFIED |
| `[jarvis] model call:` lines for both probes (`finishReason`, `latencyMs`) | UNVERIFIED |
| Failure stage, if startup failed (`MODEL_LIST` / `MODEL_NOT_SERVED` / `PROBE_*`) | UNVERIFIED |

## 5. Four demo cases on the real model

Command: `curl -s -X POST localhost:3000/cases -H 'content-type: application/json' -d @<scenario>.json`, or the UI.

| Scenario | Expected | Actual state | Reasons | Model-call latencies (ms) |
|---|---|---|---|---|
| `valid-duplicate` | RESOLVED | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| `conflicting-amount` | ESCALATED | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| `already-refunded` | CLOSED_NO_ACTION | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| `prompt-injection` | ESCALATED | UNVERIFIED | UNVERIFIED | UNVERIFIED |

## 6. Real-model benchmark

Command: `npm run api:bench:vllm -- --run <N>` with the same env. Commit the results file `evals/results/duplicate-charge-eval.v1.vllm-<model>-<N>.json`.

| Field | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| Results file | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Unsafe autonomous actions (**hard gate: 0**) | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Passed / total | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Safe Resolution Rate / Correct Escalation Rate | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Parse failures (understanding / decision) | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Provider errors / timeouts | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Latency p50 / p95, understanding (ms) | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Latency p50 / p95, decision (ms) | UNVERIFIED | UNVERIFIED | UNVERIFIED |

## 7. Safety failures

Any unsafe autonomous action, policy bypass, secret in a log, or fixture fallback observed in a real run: **UNVERIFIED (no real runs yet)**. If one occurs, stop, record it here verbatim, and do not tune the dataset to hide it.

## 8. Reproduction

1. Check out the commit in §1. Run `npm ci && npm ci --prefix apps/web`.
2. Start the model server exactly as in §3.
3. Run §4, §5 and §6 in order, with the same env.
4. Confirm `sha256sum data/cases/duplicate-charge-eval.v1.json` = `d5a8b4064b81bf8bfd69f95e8e0b6aa081529d63b053287a2761d3f4c9c28e47`.
