<#
.SYNOPSIS
  Starts the JARVIS API on the live AMD model for screen recording. The key is typed once at a hidden prompt.

.DESCRIPTION
  Sets the JARVIS_* variables for THIS PowerShell process only, runs `npm run api:start` in the foreground
  (stop it with Ctrl+C), then clears every variable it set. Nothing is written to disk and the key never
  appears in a command line, so it cannot land in PowerShell history.
  The startup gate refuses to serve unless the model is listed and passes both schema probes.

.EXAMPLE
  Set-ExecutionPolicy -Scope Process Bypass -Force
  & .\docs\submission\recording\start-live-api.ps1
#>
param(
  [string]$BaseUrl = "https://developer.amd.com.cn/radeon/api/v1",
  [string]$Model = "DeepSeek-V4-Flash",
  # Optional second model for request understanding (e.g. Gemma-4-31B-IT). Empty = one model for both stages.
  [string]$UnderstandingModel = "",
  # Per-call model timeout; raise it (e.g. 90000) when Gemma handles understanding.
  [ValidateRange(5000, 120000)][int]$TimeoutMs = 30000
)
$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "..\..\.."))
$names = "JARVIS_AI_MODE", "JARVIS_MODEL_BASE_URL", "JARVIS_MODEL_NAME", "JARVIS_MODEL_API_KEY", "JARVIS_MODEL_TIMEOUT_MS",
  "JARVIS_MODEL_MAX_RETRIES", "JARVIS_DAILY_MODEL_CALL_BUDGET", "JARVIS_MODEL_STRUCTURED_OUTPUT", "JARVIS_MODEL_MIN_INTERVAL_MS", "JARVIS_UNDERSTANDING_MODEL_NAME", "PORT"

# The web dev server proxies to port 3000, so the live API must use it. Stop any fixture API on 3000 first.
if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
  Write-Host "Port 3000 is in use (probably a fixture JARVIS API). Stop it first; nothing was started." -ForegroundColor Red
  exit 2
}
$secure = Read-Host "API key (input hidden; not stored)" -AsSecureString
$bstr =[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ($key -notmatch '^rc-[0-9a-fA-F]{48}$') {
    Write-Host "Key format check FAILED (must be rc- plus 48 hex characters, no spaces). Nothing was started." -ForegroundColor Red
    exit 3
  }
  Write-Host "Key format check passed. Starting the API on $Model (Ctrl+C to stop)..."
  $env:JARVIS_AI_MODE = "vllm"
  $env:JARVIS_MODEL_BASE_URL = $BaseUrl
  $env:JARVIS_MODEL_NAME = $Model
  $env:JARVIS_MODEL_API_KEY = $key
  $env:JARVIS_MODEL_TIMEOUT_MS = "$TimeoutMs"
  $env:JARVIS_MODEL_MAX_RETRIES = "1"
  $env:JARVIS_DAILY_MODEL_CALL_BUDGET = "300"
  $env:JARVIS_MODEL_STRUCTURED_OUTPUT = "json_object"
  $env:JARVIS_MODEL_MIN_INTERVAL_MS = "3100"
  if ($UnderstandingModel) { $env:JARVIS_UNDERSTANDING_MODEL_NAME = $UnderstandingModel }
  $env:PORT = "3000"
  Remove-Variable key
  & npm run api:start
}
finally {
  foreach ($n in $names) { Remove-Item "env:$n" -ErrorAction SilentlyContinue }
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  Remove-Variable secure, bstr -ErrorAction SilentlyContinue
  Write-Host "API stopped; JARVIS_* variables cleared from this window."
}
