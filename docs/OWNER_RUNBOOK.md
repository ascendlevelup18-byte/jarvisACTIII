# Owner runbook (Windows PowerShell)

Copy each block on its own. Secrets are only ever entered at hidden `Read-Host` prompts, never typed into commands, because PowerShell keeps a history file of typed commands. Run the blocks in order, in **one PowerShell window** unless a step says otherwise. Replace only the `<...>` placeholders. **Never paste the API key into a command, a file or this document.** The scripts ask for it at a hidden prompt.

Repository folder used below: `C:\jarvis-actiii-preview`. Branch: `claude/kickoff-day1-jkg6ry`.

---

## 1. Pull the feature branch safely

```powershell
cd C:\jarvis-actiii-preview
```

```powershell
git status --short
```

If that prints anything, stop: you have local changes. Commit or stash them first. Your `.gitignore` additions are already committed upstream.

```powershell
git fetch origin claude/kickoff-day1-jkg6ry
```

```powershell
git switch claude/kickoff-day1-jkg6ry
```

```powershell
git pull --ff-only origin claude/kickoff-day1-jkg6ry
```

```powershell
git log -1 --oneline
```

---

## 2. Install dependencies

```powershell
node --version
```

This must print v24 or newer.

```powershell
npm ci
```

```powershell
npm ci --prefix apps/web
```

Optional sanity check (about 1 minute):

```powershell
npm test
```

---

## 3. Discover the live AMD models

Sign in at **https://notebooks.amd.com/tokenfactory** (the hackathon's Token Factory, per the event FAQ) and copy the OpenAI-compatible base URL shown there. It ends in `/v1`. Do not use a URL from anywhere else; in particular, do not use `developer.amd.com.cn/radeon/api/v1` (a different AMD service) unless that dashboard shows it.

```powershell
$Base = "<base URL copied from the official Token Factory page>"
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\tokenfactory-smoke.ps1 -BaseUrl $Base
```

**Expect:**
- step 1 prints `401` or `403`;
- you paste the key at the hidden prompt (it shows `****`);
- step 2 lists model ids.

Choose an **instruct/chat** model id from that list.

---

## 4. Run one real model request

```powershell
$Model = "<model id exactly as listed in step 3>"
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\tokenfactory-smoke.ps1 -BaseUrl $Base -Model $Model
```

**Expect:** `ok · <ms> · model=<id> · prompt_tokens=… · completion_tokens=…`. Write down the date, model id, latency and token counts. **This is your first evidence of live AMD-hosted inference.** Put it in `docs/AMD_EVIDENCE.md` (never the key).

**If it fails:**
- `HTTP 401/403`: wrong key, or the key doesn't belong to this URL.
- `HTTP 404`: wrong URL or model id.
- `HTTP 429`: quota or rate limit.
- `No HTTP response`: network, proxy or TLS.

---

## 5. Run JARVIS in real-model mode

Read the key into this window's environment only. The plain copy is released and the variables are removed:

```powershell
$k = Read-Host "API key" -AsSecureString
```

```powershell
$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($k)
$env:JARVIS_MODEL_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)
Remove-Variable k, b
```

```powershell
$env:JARVIS_AI_MODE = "vllm"
$env:JARVIS_MODEL_BASE_URL = $Base
$env:JARVIS_MODEL_NAME = $Model
$env:JARVIS_MODEL_TIMEOUT_MS = "20000"
$env:JARVIS_MODEL_MAX_RETRIES = "1"
$env:JARVIS_DAILY_MODEL_CALL_BUDGET = "300"
$env:PORT = "3000"
```

```powershell
npm run api:start
```

**Expect** a startup line with `"modelListed":true` and both probes `"ok"`. If it exits with `MODEL_LIST`, `MODEL_NOT_SERVED` or `PROBE_*`, see `docs/TOKEN_FACTORY_SETUP.md` §3. JARVIS never falls back to fixture AI. Leave this window running.

**Second PowerShell window (the web app):**

```powershell
cd C:\jarvis-actiii-preview
```

```powershell
npm run web:dev
```

Open http://127.0.0.1:43123. The header chip must read `MODEL · <your model id>`.

---

## 6. Verify the three workflows

**Third PowerShell window:**

```powershell
cd C:\jarvis-actiii-preview
```

```powershell
npm run demo:verify
```

**Expect** `13/13 checks passed · ready to record` with fixture AI. With a real model, a different outcome (for example #48291 escalating conservatively) is a **real result to record, not a bug to hide**. Never edit the checks to make them pass. The safety checks (no execution on #48294 or #48293; free text refused) must always pass.

---

## 7. Run the real-model benchmark

Stop the server in the first window (Ctrl+C), then in that same window (the env variables are still set):

```powershell
npm run api:bench:vllm -- --run tf-1
```

**Hard gate:** `Unsafe autonomous actions 0`. The results file is written under `evals/results/` with the model name in it. Copy the summary into `docs/AMD_EVIDENCE.md`.

Clear the key when done:

```powershell
Remove-Item Env:JARVIS_MODEL_API_KEY
```

---

## 8. Deploy a Vercel preview (only when you decide to)

The public preview runs **fixture AI**. Do not add `JARVIS_MODEL_*` variables to Vercel unless you deliberately opt in (`docs/TOKEN_FACTORY_SETUP.md` §4).

```powershell
npx vercel@63 login
```

```powershell
npx vercel@63 link
```

Pick your existing project. If asked to connect the Git repository, answer **No**.

```powershell
npx vercel@63 deploy
```

There is **no `--prod` flag**, so this is a preview. Copy the preview URL it prints.

---

## 9. Check public judge access

```powershell
$Preview = "<preview URL from step 8>"
```

```powershell
npm run demo:verify -- $Preview
```

If every check fails with HTTP 401, deployment protection is on. It's your decision whether to share a protection-bypass link or turn protection off for previews (Vercel → Project → Settings → Deployment Protection). To verify through protection:

Paste the bypass secret at a hidden prompt. Typing it into a command would save it in PowerShell's history file.

```powershell
$s = Read-Host "Vercel bypass secret" -AsSecureString
$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
$env:VERCEL_AUTOMATION_BYPASS_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)
Remove-Variable s, b
```

```powershell
npm run demo:verify -- $Preview
```

```powershell
Remove-Item Env:VERCEL_AUTOMATION_BYPASS_SECRET
```

Finally, open the preview URL in a **private browser window** (no Vercel login) to see exactly what a judge sees.

---

## 10. Record the demo

1. Run `npm run demo:verify` against the target you will record (local or preview). It must say `ready to record`.
2. In the app, go to **Settings → Clear recorded cases**.
3. Follow `docs/DEMO_SCRIPT.md` (3:00) and use `docs/STORYBOARD.md` as the shot list.
4. Record with any screen recorder; on Windows, Xbox Game Bar is **Win+Alt+R**.
5. Say "fixture AI" unless the header chip shows your real model **and** `docs/AMD_EVIDENCE.md` holds the run from steps 4–7.
