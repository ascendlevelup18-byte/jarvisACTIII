<#
.SYNOPSIS
  Owner-run live test of the AI Executive Team on one free OpenRouter model. The key is typed once at a
  hidden prompt, lives only in this process and its child server, and is never written anywhere.

.DESCRIPTION
  Stages (each stage runs only if the previous one passed):
    0. Startup gate, no inference: the model must be listed with zero prompt and completion prices, and
       the key's limit is read from OpenRouter's key endpoint. Any failure stops here.
    1. CFO alone: 1 model call. Must return valid structured JSON from exactly the requested model.
    2. CFO + COO + CEO: 3 model calls.
    3. All six specialists: 6 model calls.
    4. One private CFO question: 1 model call (figures not in the data are withheld).
    5. Commerce Recovery Mission (needs -WithAmd): the six-specialist plan must contain a refund or
       support-automation proposal; then the canonical duplicate-charge order #48291 goes through JARVIS on
       the same server, with the AMD model (DeepSeek-V4-Flash) for understanding and proposal. Policy decides,
       the SIMULATED gateway executes only if authorized, and read-back must verify it.
  OpenRouter: at most 11 requests; the server's hard cap (-MaxRequests, default 12) stops anything beyond it.
  -WithAmd adds a second hidden prompt for the AMD key and about 4 AMD calls (2 startup probes + the case).
  Free-only mode is always on: a ':free' model id is required and any reported cost stops the provider.
  There are no retries. HTTP 429 or 402 (quota or spend limit) stops the run and is reported as is.

  The API listens on 127.0.0.1 only, with a random operator token generated for this run.
  Evidence (no key, no token): evals/results/team-live-<time>.json. The script then scans the server
  logs and the new result files for the key and reports only the number of matches.

  Exit codes: 0 all requested stages passed; 2 bad arguments or port in use; 3 key format;
  11 startup gate failed; 12 a stage failed; 14 key found in logs or results.
#>
param(
  # Default: the largest free model listed with structured-output support on 2026-10-17. That day
  # qwen/qwen3.8-27b and openai/gpt-oss-20b had no ':free' variant. The startup gate re-checks both
  # the listing and the zero price before any request.
  [string]$Model = "nvidia/nemotron-3-super-120b-a12b:free",
  [ValidateSet("check", "cfo", "three", "six", "all")][string]$Stage = "all",
  # First stage to run: cfo (default), three, or six (skips stages that already passed in an earlier run).
  [ValidateSet("cfo", "three", "six")][string]$From = "cfo",
  [ValidateRange(1, 40)][int]$MaxRequests = 12,
  [int]$Port = 3220,
  [ValidateRange(5000, 120000)][int]$TimeoutMs = 120000,
  [string]$KeyPattern = '^sk-or-v1-[0-9a-fA-F]{64}$',
  # Also run the core JARVIS engine on the AMD model and finish with the Commerce Recovery Mission.
  [switch]$WithAmd,
  [string]$AmdBaseUrl = "https://developer.amd.com.cn/radeon/api/v1",
  [string]$AmdModel = "DeepSeek-V4-Flash",
  # Tests only: a loopback mock of the OpenRouter API. Only then may the key come from JARVIS_TEAM_TEST_KEY.
  [string]$BaseUrl = ""
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if ($Model -notmatch '^[a-z0-9][a-z0-9-]*/[A-Za-z0-9._-]+:free$') {
  Write-Host "Model must be one explicit free OpenRouter id ending in :free (not openrouter/free)." -ForegroundColor Red
  exit 2
}
if ($BaseUrl -and $BaseUrl -notmatch '^http://127\.0\.0\.1:\d+/v1$') {
  Write-Host "-BaseUrl is only for a loopback test server (http://127.0.0.1:<port>/v1)." -ForegroundColor Red
  exit 2
}
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
  Write-Host "Port $Port is already in use. Pass a free port with -Port. Nothing was started." -ForegroundColor Red
  exit 2
}
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$logDir = Join-Path $env:TEMP "jarvis-team-$stamp"
New-Item -ItemType Directory -Force $logDir | Out-Null
$apiLog = Join-Path $logDir "api.log"
$apiErr = Join-Path $logDir "api.err.log"
$prefix = if ($BaseUrl) { "team-mock" } else { "team-live" }
$evidencePath = "evals/results/$prefix-$stamp.json"
$names = "JARVIS_AI_MODE", "JARVIS_TEAM_PROVIDER", "JARVIS_TEAM_API_KEY", "JARVIS_TEAM_MODEL", "JARVIS_TEAM_MAX_REQUESTS", "JARVIS_TEAM_MAX_USD",
  "JARVIS_TEAM_MAX_OUTPUT_TOKENS", "JARVIS_TEAM_TIMEOUT_MS", "JARVIS_TEAM_FREE_ONLY", "JARVIS_TEAM_BASE_URL", "JARVIS_CASES_TOKEN", "JARVIS_HOST", "PORT",
  "JARVIS_MODEL_BASE_URL", "JARVIS_MODEL_NAME", "JARVIS_MODEL_API_KEY", "JARVIS_MODEL_TIMEOUT_MS", "JARVIS_MODEL_MAX_RETRIES",
  "JARVIS_DAILY_MODEL_CALL_BUDGET", "JARVIS_MODEL_STRUCTURED_OUTPUT", "JARVIS_MODEL_MIN_INTERVAL_MS"
$request = "Our business is underperforming. I want my AI executive team to investigate the reasons, propose the highest-impact improvements and identify operational actions we can safely automate."
$evidence = [ordered]@{
  kind = $(if ($BaseUrl) { "TEST MOCK (not a model; not evidence of live inference)" } else { "OPENROUTER LIVE INFERENCE (AI Executive Team, synthetic store data)" })
  note = "OpenRouter is not AMD infrastructure; this evidence does not count toward the AMD or Gemma-on-AMD requirement."
  capturedAt = (Get-Date).ToUniversalTime().ToString("o")
  endpoint = $(if ($BaseUrl) { $BaseUrl } else { "https://openrouter.ai/api/v1" })
  model = $Model; stageRequested = $Stage; maxRequests = $MaxRequests
  gitHead = (git rev-parse HEAD); gitDirty = [bool](git status --porcelain); request = $request; stages = [ordered]@{}
}
$code = 0
$api = $null
$secure = if ($BaseUrl -and $env:JARVIS_TEAM_TEST_KEY) { ConvertTo-SecureString $env:JARVIS_TEAM_TEST_KEY -AsPlainText -Force } else { Read-Host "OpenRouter key (input hidden; not stored)" -AsSecureString }
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$script:keyText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
$script:amdText = $null
$amdBstr = [IntPtr]::Zero
if ($WithAmd) {
  if ($AmdBaseUrl -notmatch '^https://.+/v1$' -and -not ($BaseUrl -and $AmdBaseUrl -match '^http://127\.0\.0\.1:\d+/v1$')) { Write-Host "AmdBaseUrl must be https and end in /v1." -ForegroundColor Red; exit 2 }
  $amdSecure = if ($BaseUrl -and $env:JARVIS_AMD_TEST_KEY) { ConvertTo-SecureString $env:JARVIS_AMD_TEST_KEY -AsPlainText -Force } else { Read-Host "AMD key (input hidden; not stored)" -AsSecureString }
  $amdBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($amdSecure)
  $script:amdText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($amdBstr)
}
$evidence.amd = $(if ($WithAmd) { [ordered]@{ endpoint = $AmdBaseUrl; model = $AmdModel } } else { "not used" })
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$script:opToken = [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
$startedLocal = Get-Date

function Invoke-Team([string]$path, $body) {
  $headers = @{ Authorization = "Bearer $script:opToken" }
  $uri = "http://127.0.0.1:$Port$path"
  try {
    if ($null -eq $body) { return Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -TimeoutSec 900 }
    $json = $body | ConvertTo-Json -Depth 6 -Compress
    return Invoke-RestMethod -Uri $uri -Headers $headers -Method Post -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($json)) -TimeoutSec 900
  } catch {
    return [pscustomobject]@{ httpError = $_.Exception.Message }
  }
}

function Test-Board([string]$name, [string[]]$agents) {
  Write-Host ("{0}) Boardroom: {1} ({2} model call(s))..." -f $name, ($agents -join " + "), $agents.Count)
  $r = Invoke-Team "/team/boardroom" @{ request = $request; agents = $agents }
  $rows = @($r.analyses | Where-Object { $_ } | ForEach-Object { [ordered]@{ agent = $_.agent; status = $_.status; model = $_.provider.model; kind = $_.provider.kind; latencyMs = $_.latencyMs; error = $_.error } })
  $bad = @($rows | Where-Object { $_.status -ne "ok" -or $_.model -ne $Model -or $_.kind -ne "live" })
  $ok = ($null -eq $r.httpError) -and ($rows.Count -eq $agents.Count) -and ($bad.Count -eq 0)
  $evidence.stages[$name] = [ordered]@{ agents = $agents; passed = $ok; analyses = $rows; usage = $r.usage; httpError = $r.httpError; result = $r }
  foreach ($row in $rows) { Write-Host ("   {0,-5} {1,-8} {2}" -f $row.agent, $row.status, $(if ($row.error) { $row.error } else { $row.model })) }
  if ($r.usage) { Write-Host ("   requests used {0}/{1}; cost reported {2} USD; cost missing on {3}; stopped: {4}" -f $r.usage.calls, $r.usage.maxRequests, $r.usage.spentUsd, $r.usage.costUnreported, $r.usage.stopped) }
  if ($r.httpError) { Write-Host "   HTTP error: $($r.httpError)" -ForegroundColor Red }
  return $ok
}

try {
 do {
  if ($KeyPattern -and $script:keyText -notmatch $KeyPattern) {
    Write-Host "Key format check FAILED (expected sk-or-v1- plus 64 hex characters, no spaces). Nothing was sent." -ForegroundColor Red
    $code = 3
    break
  }
  if ($WithAmd -and -not $BaseUrl -and $script:amdText -notmatch '^rc-[0-9a-fA-F]{48}$') {
    Write-Host "AMD key format check FAILED (rc- plus 48 hex characters). Nothing was sent." -ForegroundColor Red
    $code = 3
    break
  }
  Write-Host "Key format check passed."
  $env:JARVIS_AI_MODE = "fixture"
  if ($WithAmd) {
    $env:JARVIS_AI_MODE = "vllm"
    $env:JARVIS_MODEL_BASE_URL = $AmdBaseUrl
    $env:JARVIS_MODEL_NAME = $AmdModel
    $env:JARVIS_MODEL_API_KEY = $script:amdText
    $env:JARVIS_MODEL_TIMEOUT_MS = "60000"
    $env:JARVIS_MODEL_MAX_RETRIES = "0"
    $env:JARVIS_DAILY_MODEL_CALL_BUDGET = "12"
    $env:JARVIS_MODEL_STRUCTURED_OUTPUT = "json_object"
    $env:JARVIS_MODEL_MIN_INTERVAL_MS = "3100"
  }
  $env:JARVIS_TEAM_PROVIDER = "openrouter"
  $env:JARVIS_TEAM_API_KEY = $script:keyText
  $env:JARVIS_TEAM_MODEL = $Model
  if ($BaseUrl) { $env:JARVIS_TEAM_BASE_URL = $BaseUrl }
  $env:JARVIS_TEAM_MAX_REQUESTS = "$MaxRequests"
  $env:JARVIS_TEAM_MAX_USD = "0.01"
  $env:JARVIS_TEAM_MAX_OUTPUT_TOKENS = "4000" # free model; reasoning models think before answering
  $env:JARVIS_TEAM_TIMEOUT_MS = "$TimeoutMs"
  $env:JARVIS_TEAM_FREE_ONLY = "1"
  $env:JARVIS_CASES_TOKEN = $script:opToken
  $env:JARVIS_HOST = "127.0.0.1"
  $env:PORT = "$Port"

  Write-Host "0) Starting the API (model listed + zero price + key limit; no inference)..."
  $api = Start-Process -FilePath "node" -ArgumentList "apps/api/src/main.ts" -RedirectStandardOutput $apiLog -RedirectStandardError $apiErr -PassThru -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds($(if ($WithAmd) { 180 } else { 60 }))
  $listening = $false
  while ((Get-Date) -lt $deadline -and -not $api.HasExited) {
    Start-Sleep -Milliseconds 500
    if ((Test-Path $apiLog) -and (Select-String -Path $apiLog -Pattern "\[jarvis\] listening" -Quiet)) { $listening = $true; break }
  }
  $line = if (Test-Path $apiLog) { Select-String -Path $apiLog -Pattern "\[jarvis\] team startup:" | Select-Object -First 1 } else { $null }
  if ($line) { $evidence.startup = ($line.Line -replace '^.*team startup:\s*', '') | ConvertFrom-Json }
  $evidence.startupGate = $listening
  if (-not $listening) {
    Write-Host "   Startup gate FAILED. Last log lines:" -ForegroundColor Red
    Get-Content $apiLog, $apiErr -ErrorAction SilentlyContinue | Select-Object -Last 6 | ForEach-Object { $l = $_.Replace($script:keyText, "[REDACTED]"); if ($script:amdText) { $l = $l.Replace($script:amdText, "[REDACTED]") }; Write-Host ("   " + $l) }
    $code = 11
    break
  }
  Write-Host ("   passed: {0} is listed with zero price. Key info: {1}" -f $Model, ($evidence.startup.key | ConvertTo-Json -Compress))
  if ($Stage -eq "check") { break }

  # -From skips stages that already passed in an earlier, committed run (saves free-tier calls).
  $evidence.from = $From
  if ($From -eq "cfo") {
    if (-not (Test-Board "1-cfo" @("cfo"))) { $code = 12; break }
  }
  if ($Stage -eq "cfo") { break }
  if ($From -ne "six") {
    if (-not (Test-Board "2-cfo-coo-ceo" @("cfo", "coo", "ceo"))) { $code = 12; break }
  }
  if ($Stage -eq "three") { break }
  # The six-specialist stage does not block the rest: a specialist whose output fails validation is
  # recorded as such (exit code 12), and the private question and mission still run on the validated plan.
  if (-not (Test-Board "3-six" @("cfo", "sales", "cmo", "coo", "hr", "ceo"))) {
    $code = 12
    if (-not $evidence.stages["3-six"].result.report) { break }
    Write-Host "   continuing with the validated specialists' plan; the failure above stays in the evidence" -ForegroundColor Yellow
  }
  if ($Stage -eq "six") { break }
  Write-Host "4) Private CFO question (1 model call)..."
  $q = Invoke-Team "/team/reply" @{ agent = "cfo"; question = "What is driving the margin decline, and which figures support that?" }
  $evidence.stages["4-cfo-private"] = [ordered]@{ passed = ($null -eq $q.httpError -and $q.provider.model -eq $Model); reply = $q }
  if ($q.httpError) { Write-Host "   HTTP error: $($q.httpError)" -ForegroundColor Red; $code = 12; break } else { Write-Host ("   {0} answered (statements withheld by the figure check: {1})" -f $q.provider.model, $q.withheld) }

  if (-not $WithAmd) { $evidence.stages["5-mission"] = "skipped (run with -WithAmd)"; break }
  Write-Host "5) Commerce Recovery Mission: team plan -> JARVIS case #48291 on $AmdModel..."
  $plan = $evidence.stages["3-six"].result.report.actions
  $link = @($plan | Where-Object { $_.lever -eq "refunds" -or $_.lever -eq "supportAutomation" }) | Select-Object -First 1
  $mission = [ordered]@{ linkedProposal = $link; note = "Illustrative link: the synthetic store's refund problem is represented by JARVIS's canonical duplicate-charge order #48291. They are separate synthetic records." }
  if (-not $link) {
    $mission.passed = $false
    $mission.reason = "the live six-specialist plan had no refund or support-automation proposal; no case was run"
    $evidence.stages["5-mission"] = $mission
    Write-Host "   no actionable refund/support proposal in the live plan; mission not run (reported, not forced)" -ForegroundColor Yellow
    $code = 12
    break
  }
  $caseReq = (& node --input-type=module -e "import { SCENARIOS } from './apps/api/src/fixtures.ts'; process.stdout.write(JSON.stringify(SCENARIOS.validDuplicate))")
  try {
    $c = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/cases" -Method Post -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($caseReq)) -TimeoutSec 900
  } catch { $c = [pscustomobject]@{ httpError = $_.Exception.Message } }
  $adapters = @($c.audit | Where-Object { $_.type -eq "UNDERSTANDING_CALL" -or $_.type -eq "MODEL_CALL" } | ForEach-Object { $_.data.adapter }) | Select-Object -Unique
  $mission.case = $c
  $mission.adapters = $adapters
  $mission.passed = ($null -eq $c.httpError) -and $c.state -eq "RESOLVED" -and $c.authorization.outcome -eq "APPROVE" -and $c.verification.verified -eq $true -and $adapters.Count -gt 0 -and -not ($adapters | Where-Object { $_ -ne "vllm:$AmdModel" })
  $evidence.stages["5-mission"] = $mission
  Write-Host ("   case {0}: state {1}, policy {2}, read-back verified {3}, AI adapters {4}" -f $c.id, $c.state, $c.authorization.outcome, $c.verification.verified, ($adapters -join ", "))
  if (-not $mission.passed) { $code = 12 }
 } while ($false)
}
finally {
  if ($api -and -not $api.HasExited) {
    $evidence.finalStatus = Invoke-Team "/team/status" $null
    Stop-Process -Id $api.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
  }
  foreach ($n in $names) { Remove-Item "env:$n" -ErrorAction SilentlyContinue }
  $evidence.envCleared = -not ($names | Where-Object { Test-Path "env:$_" })
  $evidence.exitCode = $code
  if ($code -ne 3) {
    $json = ($evidence | ConvertTo-Json -Depth 30).Replace($script:opToken, "[REDACTED]")
    [IO.File]::WriteAllText((Join-Path $root $evidencePath), $json + "`n")
  }
  $hits = 0
  if ($script:keyText) {
    $scan = @($apiLog, $apiErr) + @(Get-ChildItem evals/results -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $startedLocal } | ForEach-Object { $_.FullName })
    foreach ($f in $scan) { if ((Test-Path $f) -and (Select-String -Path $f -SimpleMatch -Pattern $script:keyText -Quiet)) { $hits++ } }
  }
  if ($script:amdText) {
    $scan = @($apiLog, $apiErr) + @(Get-ChildItem evals/results -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $startedLocal } | ForEach-Object { $_.FullName })
    foreach ($f in $scan) { if ((Test-Path $f) -and (Select-String -Path $f -SimpleMatch -Pattern $script:amdText -Quiet)) { $hits++ } }
  }
  if ($amdBstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($amdBstr) }
  $script:amdText = $null
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  $script:keyText = $null
  $script:opToken = $null
  Remove-Variable secure, bstr -ErrorAction SilentlyContinue
  if ($hits -gt 0) { Write-Host "   KEY FOUND in $hits log/result file(s) under $logDir or evals/results. Delete them." -ForegroundColor Red; $code = 14 }
  if ($code -ne 3) { Write-Host "Evidence: $evidencePath" }
  Write-Host ("Done. env cleared: {0}; key found in files: {1}; exit code {2}" -f $evidence.envCleared, $hits, $code)
}
exit $code
