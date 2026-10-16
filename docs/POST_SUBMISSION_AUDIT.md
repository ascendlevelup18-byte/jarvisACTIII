# Post-submission audit — 16 Oct 2026

## Preservation and evidence boundaries

Submitted default branch: `claude/kickoff-day1-jkg6ry`, baseline `e74eb27abfa1f157b5bf6d6c0a919e97630d29f7`. Improvements live on `post-submission/audit-hardening-2026-10-16`. No merge, deployment, alias change, environment change, or submission edit is part of this work. Automatic Vercel Git deployment is disabled for this exact improvement branch in its configuration; this is not a global deployment lock.

Vercel's read-only deployment lookup reports the judging URL as production, READY, deployment `dpl_99iVazRgiMpgxPoC2iatkT8tGRZS`, source `cli`, commit `9c7a707902d21130085f23cae530026a8afeb710`. The deployed revision differs from the repository default. Local tests describe the repository revision; public HTTP/browser checks describe the judging deployment. Neither proves the other.

The public demo uses synthetic commerce data, deterministic fixture AI, and simulated payments. No real payment or live AMD inference was performed in this audit. Historical AMD artifacts are repository evidence, not a fresh verification of endpoint availability, hardware, or Token Factory portal identity.

## Prioritized plan and execution

| Priority | Finding | Action / status |
|---|---|---|
| P0 | Judging is active; deployed revision differs from default | Preserve both; record their separate identities. Completed. |
| P1 | Existing demo verifier checks three of four scenarios and does not enforce a fixture runtime | Added `--fixture`, health and per-case adapter checks, synthetic store assertions, exact canonical-order coverage, fourth conflicting-amount scenario, and JSON evidence output. Negative tests prove wrong runtime and incomplete seeds fail before any case POST. Completed. |
| P1 | README says serverless is fixture-only, but source supports an explicit live opt-in | Corrected README. Public demo remains fixture. Before any future public live inference: enforce shared quotas, account for startup/probe costs, require access control and review runtime error redaction. Deferred infrastructure work. |
| P1 | CI excludes pushes to post-submission branches and PRs targeting the actual default branch | Extended CI triggers. No deployment step added; this branch's automatic Vercel deployment disabled. Completed; local checks run, hosted branch CI must be inspected after push. |
| P2 | Command Center hides the fourth canonical scenario | Added order 48292 to the existing saved-request controls. Local browser confirmed $250-vs-$180 contradiction escalates, policy DENY, verification not performed, no action executed. Completed. |
| P2 | Setup and handover documents contradict later recorded live testing | Updated setup status and marked handover as historical with current evidence links. Completed. |
| P2 | PowerShell 7 prints rate-limit header arrays as `System.String[]` | Join header values before formatting. Existing mocked-gateway regression now passes. Completed. |
| P2 | Browser harnesses predate current navigation; broad UX coverage is not established | Refresh automated desktop/mobile and keyboard journeys, including Orders → case → approvals → audit and empty/error states. Deferred; this audit only claims the focused browser checks below. |

## Verification results

| Check | Result / scope |
|---|---|
| Repository, demo HTML, JS/CSS assets, health and demo-store links | HTTP 200; asset hashes recorded externally in `link-audit.json` |
| Selected documentation path references | Checked README, submission, demo script, Token Factory setup and Vercel preview setup; results in `link-audit.json`. Not a crawl of every historical document or external provider link. |
| Existing deployed demo verifier | 13/13 before improvement |
| Expanded deployed fixture verifier | 21/21; all four scenarios; fixture adapter attribution; synthetic data; simulated payments; free text and altered demo refused 403; GET /cases refused 405 |
| API typecheck and tests | Pass; 293/293 tests, including two new verifier rejection tests |
| Web typecheck/build | Pass; 184 modules built |
| Web tests after saved-request change | 81/81 |
| Legacy tests | 58/58 |
| Pinned fixture benchmark | CI gate passed, 0 unsafe autonomous actions; 29/30 exact outcomes. DC-S04 remains a conservative escalation. `data/` and `evals/` unchanged. This is fixture evidence only. |
| Dependency installation audit | npm reported 0 vulnerabilities in both locked installs; not a comprehensive security assessment |
| Public browser | Duplicate charge → RESOLVED, APPROVE, simulated read-back confirmed; suspicious $5,000 request → ESCALATED, DENY, no execution; fixture labels visible; captured warning/error log empty |
| Local branch browser | Fourth request accessible; #48292 → ESCALATED with EVIDENCE CONTRADICTION, DENY, no execution; warning/error log empty |

Reproduce with Node 24:

```text
npm ci
npm ci --prefix apps/web
npm run check
npm run legacy:check
npm run api:bench:ci
git diff --exit-code -- data evals
npm run demo:verify -- --fixture --evidence fixture-evidence.json https://jarvis-actiii-preview.vercel.app
```

On this Windows host, use the installed PowerShell runtime explicitly for mocked smoke tests: `$env:PWSH = (Get-Command pwsh).Source`. The inherited Windows PowerShell child environment failed to load `ConvertTo-SecureString`. Tests requiring local fake HTTP servers also require loopback network access; sandbox-denied connections were rerun with that access. With the correct runtime, an actual header-formatting defect surfaced and was fixed rather than skipping the test.

## Safety review and remaining limitations

Source review confirms method/body/schema validation and exact public-demo allowlisting, constant-time bearer comparison for privileged input, deterministic policy and pre-execution revalidation, simulated gateway execution, read-back verification, and isolated public demo worlds. Existing tests exercise injection, malformed model output, timeouts, mismatched read-back, stale state and repeated execution. These are bounded tests, not a general security guarantee.

Live serverless opt-in remains an implementation capability. Its limiter is per instance, runtime initialization precedes case capacity reservation, and startup probes are outside the per-case budget. Do not treat opt-in as sufficient protection for public paid inference. The serverless wrapper also reads the request text before the shared 64 KiB ingress check; bounded streaming reads would be useful future hardening. Neither issue required changing the submitted fixture deployment.

Recorded cases live in browser storage, with a newest-50 limit, and review queues are demonstrations rather than an authenticated, durable multi-user approval system. Real payment integration, persistent idempotency across workers, identity and permissions, shared quotas, operational alerting, and live-provider qualification remain separate future work.

During judging, keep the submitted links and deployment fixed. Review this branch independently; no merge or release is implied by these results.
