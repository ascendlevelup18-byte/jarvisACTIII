<#
.SYNOPSIS
  Owner-run deployment of the JARVIS cloud gateway Edge Function to the jarvis-actiii-cloud Supabase project.
  Uses the official Supabase CLI (downloaded by npx, pinned version). Sign-in happens in your browser; no
  token or key is typed here or stored in the repository. Deploying sends code only: no provider is called
  and no secret is set by this script.
#>
param([string]$ProjectRef = "bxjveqmdcnhvlzuotode", [string]$CliVersion = "2.48.3")
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
node scripts/sync-edge-shared.mjs
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "1) Supabase sign-in (opens your browser)..."
& npx --yes "supabase@$CliVersion" login
if ($LASTEXITCODE -ne 0) { Write-Host "Sign-in failed." -ForegroundColor Red; exit 1 }
Write-Host "2) Deploying jarvis-gateway to $ProjectRef (JWT verification on)..."
& npx --yes "supabase@$CliVersion" functions deploy jarvis-gateway --project-ref $ProjectRef --use-api
if ($LASTEXITCODE -ne 0) { Write-Host "Deploy failed." -ForegroundColor Red; exit 1 }
Write-Host "Deployed. Nothing calls a model until the secrets AND JARVIS_TEAM_LIVE_ENABLED=1 are set by you."
