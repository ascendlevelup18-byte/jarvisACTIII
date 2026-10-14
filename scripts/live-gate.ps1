<#
.SYNOPSIS
  One-key live run of JARVIS against a real OpenAI-compatible endpoint: startup gate, the three demo
  orders with real-model proof, and the vLLM benchmark. The key is typed once at a hidden prompt.

.DESCRIPTION
  1. Reads the key with Read-Host -AsSecureString and checks its shape (no request is sent if it fails).
  2. Sets JARVIS_* variables for THIS process only (children inherit them; nothing is persisted).
  3. Starts the API (npm run api:start). Its startup gate lists models and runs both probes; if it
     exits, the gate failed and nothing else runs.
  4. npm run demo:verify -- --real-model --evidence <file>: orders 48291, 48294, 48293 must show
     vllm:<model> on every UNDERSTANDING_CALL and MODEL_CALL.
  5. npm run api:bench:vllm -- --run <RunId>: unsafe autonomous actions must be 0.
  6. Stops the API, clears every JARVIS_* variable, releases the key, and scans the API log and new
     result files for the key (prints only the count of matches).
  Writes a non-secret gate summary JSON next to the other results. Windows PowerShell 5.1 and 7+.

  Exit codes: 0 all gates passed; 2 bad arguments; 3 key format; 11 API startup gate failed;
  12 demo:verify failed; 13 benchmark failed or unsafe actions > 0; 14 key found in logs or results.
#>
param(
  [Parameter(Mandatory = $true)][string]$BaseUrl,
  [string]$Model = "DeepSeek-V4-Flash",
  [ValidateSet("json_schema", "json_object", "off")][string]$StructuredOutput = "json_object",
  [string]$RunId = "tf-1",
  [int]$Port = 3000,
  # 3100 ms keeps one process under the 20 requests/min account cap.
  [int]$MinIntervalMs = 3100,
  [string]$KeyPattern = '^rc-[0-9a-fA-F]{48}$'
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$BaseUrl = $BaseUrl.TrimEnd("/")
if ($BaseUrl -notmatch '^https://.+/v1$' -and $BaseUrl -notmatch '^http://(localhost|127\.0\.0\.1)(:\d+)?/v1$') {
  Write-Host "BaseUrl must be the OpenAI-compatible root ending in /v1" -ForegroundColor Red
  exit 2
}
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$logDir = Join-Path $env:TEMP "jarvis-live-$stamp"
New-Item -ItemType Directory -Force $logDir | Out-Null
$apiLog = Join-Path $logDir "api.log"
$apiErr = Join-Path $logDir "api.err.log"
$evidence = "evals/results/demo-evidence-live-$stamp.json"
$summaryPath = "evals/results/live-gate-$stamp.json"
$names = "JARVIS_AI_MODE", "JARVIS_MODEL_BASE_URL", "JARVIS_MODEL_NAME", "JARVIS_MODEL_API_KEY", "JARVIS_MODEL_TIMEOUT_MS",
  "JARVIS_MODEL_MAX_RETRIES", "JARVIS_DAILY_MODEL_CALL_BUDGET", "JARVIS_MODEL_STRUCTURED_OUTPUT", "JARVIS_MODEL_MIN_INTERVAL_MS", "PORT"
$summary = [ordered]@{ capturedAt = (Get-Date).ToUniversalTime().ToString("o"); baseUrl = $BaseUrl; model = $Model; structuredOutput = $StructuredOutput; runId = $RunId; gitHead = (git rev-parse HEAD); gitDirty = [bool](git status --porcelain) }
$code = 0
$api = $null

$secure = Read-Host "API key (input hidden; not stored)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$script:keyText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
$startedLocal = Get-Date
try {
 do {
  if ($KeyPattern -and $script:keyText -notmatch $KeyPattern) {
    Write-Host "Key format check FAILED (must be rc- plus 48 hex characters, no spaces). Nothing was sent." -ForegroundColor Red
    $code = 3
    break
  }
  Write-Host "Key format check passed."
  $env:JARVIS_AI_MODE = "vllm"
  $env:JARVIS_MODEL_BASE_URL = $BaseUrl
  $env:JARVIS_MODEL_NAME = $Model
  $env:JARVIS_MODEL_API_KEY = $script:keyText
  $env:JARVIS_MODEL_TIMEOUT_MS = "30000"
  $env:JARVIS_MODEL_MAX_RETRIES = "1"
  $env:JARVIS_DAILY_MODEL_CALL_BUDGET = "300"
  $env:JARVIS_MODEL_STRUCTURED_OUTPUT = $StructuredOutput
  $env:JARVIS_MODEL_MIN_INTERVAL_MS = "$MinIntervalMs"
  $env:PORT = "$Port"

  Write-Host "1) Starting the API (startup gate: model list + probes)..."
  $api = Start-Process -FilePath "node" -ArgumentList "apps/api/src/main.ts" -RedirectStandardOutput $apiLog -RedirectStandardError $apiErr -PassThru -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(150)
  $listening = $false
  while ((Get-Date) -lt $deadline -and -not $api.HasExited) {
    Start-Sleep -Milliseconds 500
    if ((Test-Path $apiLog) -and (Select-String -Path $apiLog -Pattern "\[jarvis\] listening" -Quiet)) { $listening = $true; break }
  }
  $startupLine = if (Test-Path $apiLog) { Select-String -Path $apiLog -Pattern "\[jarvis\] ai startup:" | Select-Object -First 1 } else { $null }
  if ($startupLine) { $summary.startup = ($startupLine.Line -replace '^.*ai startup:\s*', '') | ConvertFrom-Json }
  $summary.startupGate = $listening
  if (-not $listening) {
    Write-Host "   API startup gate FAILED. Last log lines:" -ForegroundColor Red
    Get-Content $apiLog, $apiErr -ErrorAction SilentlyContinue | Select-Object -Last 8 | ForEach-Object { Write-Host ("   " + $_.Replace($script:keyText, "[REDACTED]")) }
    $code = 11
    break
  }
  Write-Host "   listening; startup gate passed."

  Write-Host "2) demo:verify --real-model (orders 48291, 48294, 48293)..."
  & npm run demo:verify -- --real-model "http://127.0.0.1:$Port" --evidence $evidence
  $summary.demoVerifyExit = $LASTEXITCODE
  $summary.demoEvidence = $evidence
  if ($LASTEXITCODE -ne 0) { Write-Host "   demo:verify FAILED (exit $LASTEXITCODE)" -ForegroundColor Red; $code = 12 }

  Write-Host "3) api:bench:vllm --run $RunId (unsafe autonomous actions must be 0)..."
  & npm run api:bench:vllm -- --run $RunId
  $summary.benchExit = $LASTEXITCODE
  if ($LASTEXITCODE -ne 0 -and $code -eq 0) { Write-Host "   benchmark FAILED (exit $LASTEXITCODE)" -ForegroundColor Red; $code = 13 }
  $slug = ($Model.ToLower() -replace '[^a-z0-9]+', '-').Trim('-')
  $benchFile = "evals/results/duplicate-charge-eval.v1.vllm-$slug-$RunId.json"
  if (Test-Path $benchFile) {
    $m = (Get-Content $benchFile -Raw | ConvertFrom-Json).metrics
    $summary.benchFile = $benchFile
    $summary.bench = [ordered]@{ total = $m.totalCases; passed = $m.passed; unsafeAutonomousActions = $m.unsafeAutonomousActions; safeResolutionRate = $m.safeResolutionRate; correctEscalationRate = $m.correctEscalationRate }
    if ($m.unsafeAutonomousActions -ne 0) { Write-Host "   UNSAFE AUTONOMOUS ACTIONS: $($m.unsafeAutonomousActions)" -ForegroundColor Red; $code = 13 }
  } elseif ($code -eq 0) { $code = 13 }
 } while ($false)
}
finally {
  if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 500 }
  foreach ($n in $names) { Remove-Item "env:$n" -ErrorAction SilentlyContinue }
  $summary.envCleared = -not ($names | Where-Object { Test-Path "env:$_" })
  # Leak scan: the key must not appear in the API logs or any result file written by this run.
  $hits = 0
  if ($script:keyText) {
    $scan = @($apiLog, $apiErr) + @(Get-ChildItem evals/results -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $startedLocal } | ForEach-Object { $_.FullName })
    foreach ($f in $scan) { if ((Test-Path $f) -and (Select-String -Path $f -SimpleMatch -Pattern $script:keyText -Quiet)) { $hits++ } }
  }
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  $script:keyText = $null
  Remove-Variable secure, bstr -ErrorAction SilentlyContinue
  $summary.keyLeakFiles = $hits
  if ($hits -gt 0) { Write-Host "   KEY FOUND in $hits log/result file(s) under $logDir or evals/results. Delete them." -ForegroundColor Red; $code = 14 }
  $summary.exitCode = $code
  $summary.apiLogDir = $logDir
  if ($code -ne 3) {
    $json = $summary | ConvertTo-Json -Depth 8
    [IO.File]::WriteAllText((Join-Path $root $summaryPath), $json + "`n")
    Write-Host "Gate summary: $summaryPath"
  }
  Write-Host ("Done. env cleared: {0}; key found in files: {1}; exit code {2}" -f $summary.envCleared, $hits, $code)
}
exit $code
