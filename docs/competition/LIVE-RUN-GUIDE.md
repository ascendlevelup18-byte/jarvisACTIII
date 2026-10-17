# Owner-run live inference guide (private, budget-capped)

These runs happen in **your own PowerShell window** on your PC. You type each key at a hidden prompt; nothing is stored, committed or put on the public site. Claude never sees the keys.

## A. AMD core (DeepSeek-V4-Flash) — four orders, about 10 model calls
Risk: the AMD key was exposed earlier and should be treated as compromised. Use it only if you accept that.
```
cd C:\jarvis-actiii-preview
git checkout feature/actiii-grand-championship
powershell -ExecutionPolicy Bypass -File scripts\live-gate.ps1 -BaseUrl https://developer.amd.com.cn/radeon/api/v1 -RunId tf-2 -DemoOnly
```
Expected: startup gate (model list + two probes), then orders 48291, 48294, 48293, 48292 with every AI call on `vllm:DeepSeek-V4-Flash`. Evidence: `evals/results/live-gate-<time>.json` and `demo-evidence-live-<time>.json` (no key inside; the script scans and reports matches). The endpoint's own limits are 20 requests/min and 1 USD/day. Real-model outcomes may differ from the fixture; misses are reported, not hidden.

## B. Gemma check (1 call) and Gemma + DeepSeek run
```
powershell -ExecutionPolicy Bypass -File scripts\tokenfactory-smoke.ps1 -BaseUrl https://developer.amd.com.cn/radeon/api/v1 -Model Gemma-4-31B-IT
```
If Gemma answers, run A again with `-UnderstandingModel Gemma-4-31B-IT -TimeoutMs 60000 -RunId tg-2`. If it is not listed, Google stays BLOCKED (no substitution).

## C. OpenRouter AI Executive Team (operator-only, local)
Set the variables in the same PowerShell window, then start the server (the key is read without echo):
```
$s = Read-Host "OpenRouter key" -AsSecureString
$env:JARVIS_TEAM_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
$env:JARVIS_TEAM_PROVIDER = "openrouter"
$env:JARVIS_TEAM_MODEL = "<approved vendor/model id>"
$env:JARVIS_TEAM_MAX_USD = "2"
$env:JARVIS_CASES_TOKEN = "<a local operator token, 24+ characters>"
npm run api:start
```
Second window: `npm run web:dev`, open http://127.0.0.1:43123/#/ai-team, open "Provider", paste the operator token, press "Use live team". Afterwards close both windows (the variables disappear with the process).
