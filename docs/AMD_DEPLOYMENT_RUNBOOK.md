# AMD deployment runbook: real-model JARVIS on vLLM + ROCm

**Status: READY TO EXECUTE, NOT YET EXECUTED.** No AMD GPU has been provisioned, and no step below has run against real hardware.

How this runbook is labelled:
- Anything tagged **[UNVERIFIED]** depends on infrastructure we haven't seen yet: the instance type, image names and versions, networking. Confirm it on the day and record it in `docs/AMD_EVIDENCE.md`.
- Everything on the JARVIS side (env vars, startup gate, benchmark command) is implemented and tested against a fake server.

**Hard rules:**
- Never expose vLLM on a public, unauthenticated port.
- Never put the model key in the UI, a commit, a screenshot or the serverless (Netlify/Vercel) environment.
- Stop the GPU when you are not using it.

## 0. Before you start

| Check | How |
|---|---|
| Credits or approved host confirmed | Event portal **[UNVERIFIED]** |
| JARVIS commit to run | `git rev-parse HEAD`, recorded in `AMD_EVIDENCE.md` §1 |
| Local gate green | `npm run api:check && npm run api:bench:ci` |
| A budget decision | Set `JARVIS_DAILY_MODEL_CALL_BUDGET`; each case uses 2 model calls, and a full benchmark run about 60 |

## 1. GPU and VRAM

```bash
rocm-smi --showproductname --showmeminfo vram     # GPU model + VRAM
cat /opt/rocm/.info/version                        # ROCm version   [UNVERIFIED path]
```

Record both values.

**Model sizing (rule of thumb, verify on the day):** the bf16 weights take about 2 bytes per parameter, plus KV cache.
- **MI300X (192 GB):** fits 7B–70B-class instruction models comfortably.
- **Smaller GPUs:** prefer a 7B–14B instruction model.

JARVIS needs an instruction-tuned model that follows JSON schemas. Long context isn't needed; prompts are under about 4k tokens.

## 2. Environment **[UNVERIFIED: image and versions]**

Use the vLLM ROCm container recommended by the current vLLM / AMD docs for the assigned GPU.

What we know:
- The vLLM ROCm docs have listed MI200 (gfx90a), MI300 (gfx942) and Radeon RX 7900 (gfx1100) as supported targets. These are older releases; check the current page.
- The container needs the GPU device nodes passed through.

```bash
docker run -it --rm \
  --device=/dev/kfd --device=/dev/dri --group-add video \
  --ipc=host --shm-size 16g \
  -p 127.0.0.1:8000:8000 \                      # bind to localhost only
  -v $HOME/models:/models \
  -e VLLM_API_KEY="$VLLM_API_KEY" \
  <vllm-rocm-image>:<tag>  bash                 # [UNVERIFIED image]
```

Record the image digest: `docker inspect --format '{{.Image}}' <container>`.

## 3. Model download and revision

```bash
huggingface-cli download <org>/<model> --revision <commit-or-tag> --local-dir /models/<name>
```

Record the exact revision (a commit hash, not just "main").

## 4. Launch vLLM with an API key, bound to localhost

```bash
vllm serve /models/<name> \
  --served-model-name <served-id> \
  --host 127.0.0.1 --port 8000 \
  --api-key "$VLLM_API_KEY" \
  --max-model-len 8192
```

The flags `--api-key`, `--host` and `--served-model-name` are standard in vLLM's OpenAI-compatible server. Confirm them against `vllm serve --help` for the installed version.

## 5. Connectivity from the JARVIS API

Run the JARVIS API **on the same host**, which is simplest, or reach the GPU host privately:

```bash
ssh -N -L 8000:127.0.0.1:8000 <user>@<gpu-host>      # tunnel; nothing public
```

Prove the endpoint is authenticated and serves the model:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/v1/models                 # expect 401
curl -s -H "Authorization: Bearer $VLLM_API_KEY" http://127.0.0.1:8000/v1/models | jq '.data[].id'
```

## 6. Structured-output check, then real-mode startup

JARVIS probes structured output itself at startup. It sends one synthetic understanding call and one decision call, and parses them strictly. Start JARVIS in vllm mode:

```bash
JARVIS_AI_MODE=vllm \
JARVIS_MODEL_BASE_URL=http://127.0.0.1:8000/v1 \
JARVIS_MODEL_NAME=<served-id> \
JARVIS_MODEL_API_KEY="$VLLM_API_KEY" \
JARVIS_MODEL_TIMEOUT_MS=30000 \
JARVIS_DAILY_MODEL_CALL_BUDGET=300 \
PORT=3000 npm run api:start
```

**Expected:**
- `[jarvis] ai startup: {... "modelListed":true,"probes":{"understanding":"ok","decision":"ok"} ...}`
- then `listening`.

**On failure:** the process exits 1 and names the stage (`MODEL_LIST`, `MODEL_NOT_SERVED`, `PROBE_UNDERSTANDING`, `PROBE_DECISION`).
- If the probes fail only because the server rejects `response_format`, retry once with `JARVIS_MODEL_STRUCTURED_OUTPUT=off`, and **record that in the evidence**.
- Never loosen parsing.

## 7. Four demo workflows

The UI is the visible demo: `npm run web:dev` proxies `/cases` to `:3000`.

Or use the API directly, sending each canonical request from `apps/api/src/fixtures.ts`:

```bash
curl -s -X POST localhost:3000/cases -H 'content-type: application/json' \
  -d '{"customerId":"CUST-1001","orderId":"48291","message":"I was charged twice for order #48291."}' | jq '.state, .reasons'
```

| Demo | Expected |
|---|---|
| Valid duplicate | RESOLVED |
| Conflicting amount | ESCALATED |
| Already refunded | CLOSED_NO_ACTION |
| Prompt injection | ESCALATED |

Record the actual states and the `[jarvis] model call:` latencies in `AMD_EVIDENCE.md` §5.

## 8. Real-model benchmark

```bash
npm run api:bench:vllm -- --run 1        # same env as step 6
```

- Writes `evals/results/duplicate-charge-eval.v1.vllm-<model>-1.json`.
- **Hard gate: 0 unsafe autonomous actions.** The command exits 1 otherwise.
- Repeat with `--run 2`, `--run 3`. Earlier files are never overwritten.
- Record the metrics in `AMD_EVIDENCE.md` §6.

## 9. Shutdown and cost control

```bash
docker stop <container>          # stops inference
# then stop/terminate the GPU instance in the cloud console   [UNVERIFIED: console steps]
```

- The JARVIS budget caps model calls per day on the API side. It does **not** stop GPU billing.
- Stop the instance as soon as evidence is captured.

## Rollback

- JARVIS: restart with `JARVIS_AI_MODE=fixture`. There is no data migration, and fixture mode needs no endpoint.
- vLLM: stop the container. The model files can stay on disk.
- No repo change is needed to roll back.

## Local fallback: Radeon RX 6800 (16 GB, RDNA2, gfx1030) **[UNVERIFIED]**

- gfx1030 is **not** among the vLLM ROCm targets listed in the vLLM docs we found (gfx90a, gfx942, gfx1100). A vLLM-on-RX 6800 setup may not work; do not plan on it without a test.
- ROCm on Windows/WSL2 has more limited Radeon support than Linux. Treat Windows vLLM as unsupported unless the exact driver, OS and GPU combination is confirmed in AMD's current compatibility matrix.
- A possible path, unverified: native Linux, a ROCm version that still supports gfx1030, and any OpenAI-compatible server. JARVIS only needs `/v1/models` and `/v1/chat/completions`.
- Any result from this GPU must be labelled **local consumer GPU**. It does not by itself meet an event requirement to run on AMD cloud GPUs.
