<#
.SYNOPSIS
  Minimal, credential-safe smoke test of an OpenAI-compatible endpoint (AMD Token Factory or self-hosted vLLM).

.DESCRIPTION
  1. GET {BaseUrl}/models WITHOUT a key  -> expect 401/403 (the endpoint requires auth).
  2. GET {BaseUrl}/models WITH the key     -> prints the model ids it serves.
  3. Optional (-Model): one tiny POST {BaseUrl}/chat/completions -> prints HTTP status, latency,
     returned model id and token usage. Never prints the key, request headers or the full response.

  The key is read with Read-Host -AsSecureString, held only in this process, and released at the end.
  Nothing is written to disk. BaseUrl has no default on purpose: copy it from the official
  Token Factory page for your account (it must end in /v1). Pick -Model from step 2's list.
  Works in Windows PowerShell 5.1 and PowerShell 7+.

.EXAMPLE
  ./scripts/tokenfactory-smoke.ps1 -BaseUrl "<base URL from the official page>"
  ./scripts/tokenfactory-smoke.ps1 -BaseUrl "<base URL>" -Model "<id exactly as listed>"
#>
param(
  [Parameter(Mandatory = $true)][string]$BaseUrl,
  [string]$Model
)
$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")
if ($BaseUrl -notmatch '^https://.+/v1$' -and $BaseUrl -notmatch '^http://(localhost|127\.0\.0\.1)(:\d+)?/v1$') {
  throw "BaseUrl must be the OpenAI-compatible root ending in /v1 (https, or http only for localhost)"
}

# Windows PowerShell 5.1 may not offer TLS 1.2 by default; hosted endpoints require it.
if ($PSVersionTable.PSVersion.Major -lt 6) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
}

# HTTP status of a failed request, without echoing request headers or bodies.
function Get-HttpStatus($err) {
  if ($err.Exception.Response) { return [int]$err.Exception.Response.StatusCode }
  return $null
}
function Fail([string]$step, $err) {
  $code = Get-HttpStatus $err
  $msg = if ($code) { "HTTP $code" } else { $err.Exception.GetType().Name }
  Write-Host "   FAILED at ${step}: $msg" -ForegroundColor Red
  if ($code -eq 401 -or $code -eq 403) { Write-Host "   The key was rejected, or it is not valid for this base URL." }
  elseif ($code -eq 404) { Write-Host "   Check the base URL (it must end in /v1) and the model id." }
  elseif ($code -eq 429) { Write-Host "   Rate limited or out of quota; wait and retry." }
  elseif (-not $code) { Write-Host "   No HTTP response (DNS, proxy, TLS or timeout)." }
  exit 1
}

Write-Host "1) /models without a key (expect 401 or 403):"
try {
  Invoke-WebRequest -UseBasicParsing -Method Get -Uri "$BaseUrl/models" -TimeoutSec 20 | Out-Null
  Write-Host "   200: the endpoint answered without a key. Unexpected for a hosted service; continuing."
} catch {
  $code = Get-HttpStatus $_
  if ($code) { Write-Host "   $code" } else { Fail "step 1 (/models without key)" $_ }
}

$secure = Read-Host "API key (input hidden; not stored)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $headers = @{ Authorization = "Bearer " + [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }

  Write-Host "2) /models with the key:"
  try { $models = Invoke-RestMethod -Method Get -Uri "$BaseUrl/models" -Headers $headers -TimeoutSec 30 }
  catch { Fail "step 2 (/models with key)" $_ }
  $ids = @($models.data | Where-Object { $_ -and $_.id } | ForEach-Object { [string]$_.id })
  if ($ids.Count -eq 0) { Write-Host "   No models are served for this key (empty or unexpected /models response)." -ForegroundColor Red; exit 1 }
  Write-Host ("   {0} model(s):" -f $ids.Count)
  $ids | ForEach-Object { Write-Host "   - $_" }

  if ($Model) {
    if ($ids -cnotcontains $Model) { Write-Host "   Model '$Model' is not in the list above. Use an id exactly as listed." -ForegroundColor Red; exit 1 }
    Write-Host "3) one minimal chat completion with ${Model}:"
    $body = @{ model = $Model; max_tokens = 8; temperature = 0; messages = @(@{ role = "user"; content = "Reply with the single word OK." }) } | ConvertTo-Json -Depth 5
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try { $r = Invoke-RestMethod -Method Post -Uri "$BaseUrl/chat/completions" -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec 60 }
    catch { Fail "step 3 (chat completion)" $_ }
    $sw.Stop()
    if (-not $r -or -not $r.choices -or -not $r.choices[0].message) {
      Write-Host "   FAILED at step 3: malformed reply (no choices[0].message); not an OpenAI-compatible chat response." -ForegroundColor Red
      exit 1
    }
    Write-Host ("   ok · {0} ms · model={1} · prompt_tokens={2} · completion_tokens={3}" -f $sw.ElapsedMilliseconds, $r.model, $r.usage.prompt_tokens, $r.usage.completion_tokens)
    $text = "" + $r.choices[0].message.content
    Write-Host ("   reply: " + ($text -replace '\s+', ' ').Substring(0, [Math]::Min(40, $text.Length)))
  }
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  Remove-Variable headers, secure, bstr -ErrorAction SilentlyContinue
}
Write-Host "Done. Record the date, base URL, model id, latency and usage in docs/AMD_EVIDENCE.md (never the key)."
