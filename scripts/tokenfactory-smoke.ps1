<#
.SYNOPSIS
  Minimal, credential-safe smoke test of an OpenAI-compatible endpoint (AMD Token Factory or self-hosted vLLM).

.DESCRIPTION
  1. GET {BaseUrl}/models WITHOUT a key  -> prints the status (a hosted service usually answers 401/403).
  The key is then read at a hidden prompt and checked locally for shape before any authenticated call;
  each format rule is reported only as pass/fail (no characters, length or fingerprint).
  2. GET {BaseUrl}/models WITH the key     -> prints the model ids it serves. Some gateways answer this
     for ANY token, so a 200 here does NOT prove the key is valid.
  3. GET {BaseUrl}/usage?include_recent=true WITH the key -> prints the HTTP status only (informational).
  4. Optional (-Model): one tiny POST {BaseUrl}/chat/completions -> prints HTTP status, latency,
     returned model id, token usage and any rate-limit headers. This is the only step that proves the key works for inference.
  Never prints the key, request headers or the full response; error snippets are redacted.

  The key is read with Read-Host -AsSecureString, held only in this process, and released at the end.
  Nothing is written to disk. BaseUrl has no default on purpose: copy it from the official
  Token Factory page for your account (it must end in /v1). Pick -Model from step 2's list.
  Works in Windows PowerShell 5.1 and PowerShell 7+.

  Exit codes (distinct, so a wrapper can tell failures apart):
    0  success
    2  bad arguments (BaseUrl shape)
    3  key format check failed (expected -KeyPattern; nothing was sent)
    4  no HTTP response (DNS, proxy, TLS or timeout)
    5  authentication rejected (HTTP 401/403)
    6  model not served (empty list, or -Model not in the list)
    7  rate limited or out of quota (HTTP 429)
    8  endpoint or model not found (HTTP 404)
    9  other HTTP error (4xx/5xx)
    10 malformed reply (not an OpenAI-compatible chat response)

.EXAMPLE
  ./scripts/tokenfactory-smoke.ps1 -BaseUrl "<base URL from the official page>"
  ./scripts/tokenfactory-smoke.ps1 -BaseUrl "<base URL>" -Model "<id exactly as listed>"
#>
param(
  [Parameter(Mandatory = $true)][string]$BaseUrl,
  [string]$Model,
  # Expected key shape. Default: AMD developer key, "rc-" plus 48 hex characters. Pass "" to skip.
  [string]$KeyPattern = '^rc-[0-9a-fA-F]{48}$',
  [ValidateRange(1, 300)][int]$ChatTimeoutSec = 60
)
$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")
if ($BaseUrl -notmatch '^https://.+/v1$' -and $BaseUrl -notmatch '^http://(localhost|127\.0\.0\.1)(:\d+)?/v1$') {
  Write-Host "BaseUrl must be the OpenAI-compatible root ending in /v1 (https, or http only for localhost)" -ForegroundColor Red
  exit 2
}

# Windows PowerShell 5.1 may not offer TLS 1.2 by default; hosted endpoints require it.
if ($PSVersionTable.PSVersion.Major -lt 6) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
}

$script:keyText = $null

# HTTP status of a failed request, without echoing request headers.
function Get-HttpStatus($err) {
  if ($err.Exception.Response) { return [int]$err.Exception.Response.StatusCode }
  return $null
}
# Short server error text with anything key-like removed (servers sometimes echo the token).
function Get-SafeSnippet($err) {
  $raw = ""
  if ($err.ErrorDetails -and $err.ErrorDetails.Message) { $raw = "" + $err.ErrorDetails.Message }
  # Windows PowerShell 5.1 often leaves ErrorDetails empty; read the WebException body instead.
  if (-not $raw -and $err.Exception.Response -and $err.Exception.Response.GetType().GetMethod("GetResponseStream")) {
    try {
      $stream = $err.Exception.Response.GetResponseStream()
      if ($stream.CanSeek) { $stream.Position = 0 }
      $raw = (New-Object IO.StreamReader($stream)).ReadToEnd()
    } catch { $raw = "" }
  }
  if (-not $raw) { return "" }
  if ($script:keyText) { $raw = $raw.Replace($script:keyText, "[REDACTED]") }
  $raw = $raw -replace '(?i)\b(rc|sk)-[A-Za-z0-9_\-]{6,}', '[REDACTED]'
  $raw = $raw -replace '(?i)bearer\s+\S+', 'Bearer [REDACTED]'
  $raw = ($raw -replace '\s+', ' ').Trim()
  return $raw.Substring(0, [Math]::Min(160, $raw.Length))
}
function Get-ExitCode($code) {
  if (-not $code) { return 4 }
  if ($code -eq 401 -or $code -eq 403) { return 5 }
  if ($code -eq 429) { return 7 }
  if ($code -eq 404) { return 8 }
  return 9
}
function Fail([string]$step, $err) {
  $code = Get-HttpStatus $err
  $msg = if ($code) { "HTTP $code" } else { $err.Exception.GetType().Name }
  Write-Host "   FAILED at ${step}: $msg" -ForegroundColor Red
  $snippet = Get-SafeSnippet $err
  if ($snippet) { Write-Host "   server said: $snippet" }
  if ($code -eq 401 -or $code -eq 403) { Write-Host "   The key was rejected, or it is not valid for this base URL." }
  elseif ($code -eq 404) { Write-Host "   Check the base URL (it must end in /v1) and the model id." }
  elseif ($code -eq 429) { Write-Host "   Rate limited or out of quota; wait and retry." }
  elseif (-not $code) { Write-Host "   No HTTP response (DNS, proxy, TLS or timeout)." }
  Write-Host ("   exit code {0}" -f (Get-ExitCode $code))
  exit (Get-ExitCode $code)
}

Write-Host "1) /models without a key (a hosted service usually answers 401 or 403):"
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
  $typed = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $script:keyText = $typed
  # Shape check: each rule is reported as pass/fail only; no character, length or fingerprint is shown.
  if ($KeyPattern) {
    $rules = [ordered]@{
      "not empty"                      = ($typed.Length -gt 0)
      "no surrounding whitespace"      = ($typed -eq $typed.Trim())
      "no embedded newline"            = (-not ($typed -match "[`r`n]"))
      "matches documented key format"  = ($typed -match $KeyPattern)
    }
    $failed = @($rules.Keys | Where-Object { -not $rules[$_] })
    foreach ($k in $rules.Keys) { Write-Host ("   key check '{0}': {1}" -f $k, $(if ($rules[$k]) { "pass" } else { "FAIL" })) }
    if ($failed.Count -gt 0) {
      Write-Host "   Key format check FAILED. Nothing was sent with the key. Re-enter it at the prompt." -ForegroundColor Red
      Write-Host "   exit code 3"
      exit 3
    }
    Write-Host "   Key format check passed."
  }
  $headers = @{ Authorization = "Bearer " + $script:keyText }

  Write-Host "2) /models with the key (a 200 here does not prove the key is valid):"
  try { $models = Invoke-RestMethod -Method Get -Uri "$BaseUrl/models" -Headers $headers -TimeoutSec 30 }
  catch { Fail "step 2 (/models with key)" $_ }
  $ids = @($models.data | Where-Object { $_ -and $_.id } | ForEach-Object { [string]$_.id })
  if ($ids.Count -eq 0) { Write-Host "   No models are served for this key (empty or unexpected /models response)." -ForegroundColor Red; Write-Host "   exit code 6"; exit 6 }
  Write-Host ("   {0} model(s):" -f $ids.Count)
  $ids | ForEach-Object { Write-Host "   - $_" }

  Write-Host "3) /usage with the key (status only, informational):"
  try {
    Invoke-RestMethod -Method Get -Uri "$BaseUrl/usage?include_recent=true" -Headers $headers -TimeoutSec 30 | Out-Null
    Write-Host "   200"
  } catch {
    $code = Get-HttpStatus $_
    $note = if ($code) { "HTTP $code" } else { "no HTTP response" }
    $snippet = Get-SafeSnippet $_
    Write-Host ("   {0}{1} (not fatal)" -f $note, $(if ($snippet) { " - $snippet" } else { "" }))
  }

  if ($Model) {
    if ($ids -cnotcontains $Model) { Write-Host "   Model '$Model' is not in the list above. Use an id exactly as listed." -ForegroundColor Red; Write-Host "   exit code 6"; exit 6 }
    Write-Host "4) one minimal chat completion with ${Model}:"
    $body = @{ model = $Model; max_tokens = 64; temperature = 0; messages = @(@{ role = "user"; content = "Say hello in one sentence." }) } | ConvertTo-Json -Depth 5
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try { $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$BaseUrl/chat/completions" -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec $ChatTimeoutSec }
    catch { Fail "step 4 (chat completion)" $_ }
    $sw.Stop()
    Write-Host ("   HTTP {0} in {1} ms" -f [int]$resp.StatusCode, $sw.ElapsedMilliseconds)
    # Rate-limit and quota headers, if the gateway sends any (names and values are not secret).
    foreach ($h in @($resp.Headers.Keys | Where-Object { $_ -match '(?i)ratelimit|rate-limit|retry-after|quota' })) { Write-Host ("   header {0}: {1}" -f $h, ($resp.Headers[$h] -join ', ')) }
    $r = $null
    try { $r = $resp.Content | ConvertFrom-Json } catch { $r = $null }
    $content = $null
    if ($r -and $r.choices -and $r.choices[0].message) { $content = $r.choices[0].message.content }
    if (-not $content -or -not ("" + $content).Trim()) {
      Write-Host "   FAILED at step 4: malformed reply (no non-empty choices[0].message.content); not a usable chat response." -ForegroundColor Red
      Write-Host "   exit code 10"
      exit 10
    }
    Write-Host ("   ok - {0} ms - model={1} - finish_reason={2} - prompt_tokens={3} - completion_tokens={4}" -f $sw.ElapsedMilliseconds, $r.model, $r.choices[0].finish_reason, $r.usage.prompt_tokens, $r.usage.completion_tokens)
    $text = (("" + $content) -replace '\s+', ' ').Trim()
    Write-Host ("   reply: " + $text.Substring(0, [Math]::Min(80, $text.Length)))
  }
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  $script:keyText = $null
  Remove-Variable headers, secure, bstr, typed -ErrorAction SilentlyContinue
}
Write-Host "Done (exit code 0). Record the date, base URL, model id, latency and usage in docs/AMD_EVIDENCE.md (never the key)."
exit 0
