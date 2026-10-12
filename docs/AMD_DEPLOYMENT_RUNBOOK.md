# AMD deployment runbook: real-model JARVIS on vLLM + ROCm

**Status: READY TO EXECUTE, NOT YET EXECUTED.** No AMD GPU has been provisioned, and no step below has run against real hardware.

How this runbook is labelled:
- Anything tagged **[UNVERIFIED]** depends on infrastructure we haven't seen yet: the instance type, image names and versions, networking. Confirm it on the day and record it in `docs/AMD_EVIDENCE.md`.
- Everything on the JARVIS side (env vars, startup gate, benchmark command) is implemented and tested against a fake server.

**Hard rules:**
- Never expose vLLM on a public, unauthenticated port.
- Never put the model key in the UI, a commit, a screenshot or the serverless (Netlify/Vercel) environment.
- Stop the GPU when you are not using it.

## Assumptions (AMD Developer Cloud, per AMD's and lablab's public getting-started guides)

- **Instance:** an AMD Developer Cloud **GPU Droplet**, typically a single MI300X with 192 GB, running **Ubuntu 24.04**. Login is **SSH key only** as `root`; provisioning reportedly takes about 2–4 minutes. **[UNVERIFIED for our account]**
- **Credits:** activated through the AMD AI Developer Program member site before creating a Droplet. **[UNVERIFIED for our account]**
- **Image:** choose a **Quick Start** image with vLLM preinstalled in a Docker container (reportedly named `rocm`; enter it with `docker exec -it rocm bash`). This avoids building ROCm or vLLM yourself. **[UNVERIFIED image name]**
- **Security:** the Quick Start image reportedly also starts a Jupyter server reachable on the Droplet's public IP. Treat the Droplet as internet-facing:
  - firewall everything except SSH;
  - never start vLLM on `0.0.0.0` without `--api-key`.
- **Model (recommended, untested here):** `Qwen/Qwen2.5-7B-Instruct`. It is Apache-2.0, needs no Hugging Face login, follows JSON-schema output well, and has bf16 weights of about 15 GB (tiny on an MI300X).
  - A 1.5B model (the tutorial default) is likely too weak for strict JSON on the decision prompt.
  - Larger options, if time allows: `Qwen2.5-14B/32B-Instruct`.
  - Pin the revision.

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
huggingface-cli download Qwen/Qwen2.5-7B-Instruct --revision <commit-hash> --local-dir /models/qwen2.5-7b-instruct
# get the hash: the model page's "Files and versions" → latest commit, or check the snapshots folder after a download
```

Record the exact revision (a commit hash, not just "main").

## 4. Launch vLLM with an API key, bound to localhost

```bash
vllm serve /models/qwen2.5-7b-instruct \
  --served-model-name qwen2.5-7b-instruct \
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

## Local fallback: Radeon RX 6800 (16 GB, RDNA2, gfx1030): decision

| Question | Finding | Confidence |
|---|---|---|
| vLLM on RX 6800 | gfx1030 is **not** among the vLLM ROCm targets in the vLLM docs we could read (gfx90a, gfx942, gfx1100). Treat it as unsupported | Vendor docs (older releases); current page not readable from here |
| ROCm on Windows for vLLM | Not a supported vLLM path. Windows needs WSL2 or native Linux, and Radeon support in WSL2 is narrower than on Linux | Vendor-matrix based; verify current matrix |
| ROCm on Linux for gfx1030 | Community reports say it often works, sometimes with `HSA_OVERRIDE_GFX_VERSION`; not guaranteed by AMD for every ROCm release | Community workaround |
| **Feasible alternative** | **llama.cpp `llama-server`** (Vulkan or ROCm/HIP backend) serves an **OpenAI-compatible** `/v1/models` + `/v1/chat/completions`. That is all JARVIS needs; no code change | Untested here |
| Model fit in 16 GB | `Qwen2.5-7B-Instruct` Q4_K_M or Q5_K_M GGUF (about 5–6 GB) leaves room for context. 14B Q4 (about 9 GB) also fits | Untested here |

**Recommended local path (untested):**
1. Native Linux, or Windows with the Vulkan build.
2. Run `llama-server -m qwen2.5-7b-instruct-q4_k_m.gguf --host 127.0.0.1 --port 8000 --api-key "$KEY"`.
3. Start JARVIS with the same env as step 6. Use `JARVIS_MODEL_STRUCTURED_OUTPUT=off` only if the server rejects `response_format`, and record that if so.

**Labelling:** results from this GPU are a **local consumer-GPU run**. They do **not** satisfy the Evolus requirement for vLLM on AMD Developer Cloud, and must not be presented as AMD Developer Cloud evidence.
