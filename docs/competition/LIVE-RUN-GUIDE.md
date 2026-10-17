# Owner-run live inference guide (private, budget-capped)

These runs happen in **your own PowerShell window** on your PC. You type each key at a hidden prompt. Nothing is stored, committed or put on the public site, and Claude never sees the keys. Each script runs the JARVIS server on `127.0.0.1` only, clears its variables when it finishes, and scans its logs and new result files for the key (it prints only the number of matches).

Run them from the repository on the championship branch:
```
cd C:\jarvis-actiii-preview
git checkout feature/actiii-grand-championship
```

## A. AMD core: DeepSeek-V4-Flash on the four demo orders (about 10 model calls)

**Risk you are accepting.** The AMD event key was exposed earlier and cannot be rotated. Anyone who saw it can spend its daily allowance or have it suspended; that is true whether or not you run this. Running the gate does not expose it further: the key goes only to `https://developer.amd.com.cn/radeon/api/v1`, from a server bound to `127.0.0.1`, for the synthetic orders only, and no public endpoint uses it. If you do not accept that risk, skip this section.

```
powershell -ExecutionPolicy Bypass -File scripts\live-gate.ps1 -BaseUrl https://developer.amd.com.cn/radeon/api/v1 -RunId tf-2 -DemoOnly
```
What runs: startup gate (model list plus two probes), then orders 48291, 48294, 48293 and 48292, every AI call on `vllm:DeepSeek-V4-Flash` (about 10 calls; one retry per call at most). Endpoint limits: 20 requests/min, 1 USD/day. The verifier checks the outcome, the policy decision, the simulated gateway, read-back and the audit for each order. If the real model gets one wrong, the run fails and says so; policy and ground truth are never changed to make it pass.

Evidence: `evals/results/live-gate-<time>.json` and `demo-evidence-live-<time>.json`. These are new results and stay separate from the October 14 recording.

## B. Gemma availability on the AMD endpoint (1 call)
```
powershell -ExecutionPolicy Bypass -File scripts\tokenfactory-smoke.ps1 -BaseUrl https://developer.amd.com.cn/radeon/api/v1 -Model Gemma-4-31B-IT
```
If Gemma answers, run A again with `-UnderstandingModel Gemma-4-31B-IT -TimeoutMs 60000 -RunId tg-2`. If it is not listed, the Google prize stays BLOCKED. A Gemma model on OpenRouter does not count: it is not shown to run on AMD hardware.

## C. OpenRouter AI Executive Team (free model, $0 key, at most 11 calls)

**Model.** OpenRouter's public model list on 2026-10-17 had **no free version of `qwen/qwen3.8-27b`** (only the paid one) and **no free `openai/gpt-oss-20b`**. The free models listed with JSON-output support were:

| Model id | JSON support listed |
|---|---|
| `nvidia/nemotron-3-super-120b-a12b:free` (default) | response_format, structured_outputs |
| `google/gemma-4-31b-it:free` | response_format |
| `google/gemma-4-26b-a4b-it:free` | response_format |
| `xingchen-agi/xing4.0-29b-a4b:free` | response_format, structured_outputs |
| `dots-studio/dots-3-note-preview:free` | response_format, structured_outputs |

The default is the NVIDIA Nemotron model. Pass `-Model <id>` to choose another `:free` id. Paid ids and the `openrouter/free` router are refused.

**Check only (no model call):**
```
powershell -ExecutionPolicy Bypass -File scripts\team-live-run.ps1 -Stage check
```
**Full staged run:**
```
powershell -ExecutionPolicy Bypass -File scripts\team-live-run.ps1
```
What runs:
0. Startup gate, no inference. The model must be listed with zero prompt and completion prices, and the key's limit and usage are read from OpenRouter's key endpoint.
1. CFO alone: 1 call.
2. CFO + COO + CEO: 3 calls.
3. All six specialists: 6 calls.
4. One private CFO question: 1 call.

Each stage runs only if the one before passed: valid structured output, from exactly the requested model, labelled live.

Hard limits in the server:
- request cap of 12 per run, counted even when no cost is reported;
- any reported cost stops the provider;
- HTTP 429 or 402 stops the run with no retry;
- one request at a time;
- 900 output tokens and 60 s per call.

Evidence: `evals/results/team-live-<time>.json`. It holds every specialist's validated output, the audit, the withheld figures, and usage per stage. It does not contain the key or the operator token.

## D. Viewing the live team in the browser (optional)

This is the manual route. It uses the same limits as the script.
```
$s = Read-Host "OpenRouter key" -AsSecureString
$env:JARVIS_TEAM_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
$env:JARVIS_TEAM_PROVIDER = "openrouter"
$env:JARVIS_TEAM_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
$env:JARVIS_TEAM_MAX_REQUESTS = "8"
$env:JARVIS_CASES_TOKEN = "<a local operator token, 24+ characters>"
npm run api:start
```
In a second window, run `npm run web:dev` and open http://127.0.0.1:43123/#/ai-team. Then:
1. Open "Provider".
2. Paste the operator token.
3. Press "Use live team".

When you finish, close both windows. The variables disappear with the process.
