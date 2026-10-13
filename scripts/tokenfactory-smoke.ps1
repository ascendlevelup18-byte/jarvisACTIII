<#
.SYNOPSIS
  Minimal, credential-safe smoke test of an OpenAI-compatible endpoint (AMD Token Factory or self-hosted vLLM).

.DESCRIPTION
  1. GET {BaseUrl}/models WITHOUT a key  -> expect 401/403 (the endpoint requires auth).
  2. GET {BaseUrl}/models WITH the key     -> prints the model ids it serves.
  3. Optional (-Model): one tiny POST {BaseUrl}/chat/completions -> prints HTTP status, latency,
     returned model id and token usage. Never prints the key, request headers or the full response.

  The key is read with Read-Host -AsSecureString, held only in this process, and cleared at the end.
  Nothing is written to disk. BaseUrl has no default on purpose: copy it from the official
  Token Factory page for your account (it must end in /v1). Pick -Model from step 2's list.

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
if ($BaseUrl -notmatch '^https?://.+/v1$') { throw "BaseUrl must be the OpenAI-compatible root ending in /v1" }

function Get-Status([scriptblock]$call) {
  try { & $call | Out-Null; return 200 }
  catch { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode } else { return "ERR: $($_.Exception.Message)" } }
}

Write-Host "1) /models without a key (expect 401 or 403):"
Write-Host ("   " + (Get-Status { Invoke-WebRequest -UseBasicParsing -Method Get -Uri "$BaseUrl/models" -TimeoutSec 20 }))

$secure = Read-Host "API key (input hidden; not stored)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $headers = @{ Authorization = "Bearer " + [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }

  Write-Host "2) /models with the key:"
  $models = Invoke-RestMethod -Method Get -Uri "$BaseUrl/models" -Headers $headers -TimeoutSec 30
  $ids = @($models.data | ForEach-Object { $_.id })
  Write-Host ("   {0} model(s):" -f $ids.Count)
  $ids | ForEach-Object { Write-Host "   - $_" }

  if ($Model) {
    if ($ids -notcontains $Model) { throw "Model '$Model' is not in the /models list above. Use an id exactly as listed." }
    Write-Host "3) one minimal chat completion with ${Model}:"
    $body = @{ model = $Model; max_tokens = 8; temperature = 0; messages = @(@{ role = "user"; content = "Reply with the single word OK." }) } | ConvertTo-Json -Depth 5
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-RestMethod -Method Post -Uri "$BaseUrl/chat/completions" -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec 60
    $sw.Stop()
    Write-Host ("   ok · {0} ms · model={1} · prompt_tokens={2} · completion_tokens={3}" -f $sw.ElapsedMilliseconds, $r.model, $r.usage.prompt_tokens, $r.usage.completion_tokens)
    $text = "" + $r.choices[0].message.content
    Write-Host ("   reply: " + ($text -replace '\s+', ' ').Substring(0, [Math]::Min(40, $text.Length)))
  }
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  Remove-Variable headers, secure -ErrorAction SilentlyContinue
}
Write-Host "Done. Record the date, base URL, model id, latency and usage in docs/AMD_EVIDENCE.md (never the key)."
