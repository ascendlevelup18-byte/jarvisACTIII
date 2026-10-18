# JARVIS ACT III release candidate (not merged, not deployed)

Branch `feature/actiii-grand-championship`. This file is updated at each gate. Production stays at `be52013` (`dpl_5GtjQFYi6ChkCYEmCX9ELsvYB5AP`) and lablab is unchanged until the owner approves a release.

## Mode declaration (what is real, what is not)
| Part | Mode today | Model / provider | Evidence |
|---|---|---|---|
| Public Judge Mode (Vercel) | **Fixture** (deterministic, not a language model) | none | Labelled in the product |
| Historical AMD run | **Recorded live**, 14 Oct 2026 | `vllm:DeepSeek-V4-Flash` on `developer.amd.com.cn/radeon/api/v1` | `evals/results/*tf-1*`, `demo-evidence-live-20261014T201902Z.json` |
| New AMD four-order run | **Recorded live, 17 Oct 2026 21:00 UTC: 25/25 checks** | `vllm:DeepSeek-V4-Flash` (served `self-dploy/DeepSeek-V4-Flash`) | `evals/results/live-gate-20261017T210008Z.json`, `demo-evidence-live-20261017T210008Z.json`; shown in Judge Mode §4 |
| AI Executive Team, local | Fixture by default; **live recorded 18 Oct 2026** (owner-run script) | `nvidia/nemotron-3-super-120b-a12b:free` via OpenRouter, cost $0 | `evals/results/team-live-20261018T055512Z.json` (six specialists all valid, private CFO answer, 20 proposals, 2 disagreements left to the owner); earlier stages and failures in T054026Z, T054209Z, T053008Z, T053156Z |
| Commerce Recovery Mission | **Live recorded 18 Oct 2026**: live team plan proposal "Reduce refunds…" (lever refunds) → case #48291 on AMD DeepSeek-V4-Flash → policy APPROVE → simulated refund → read-back verified | OpenRouter team + AMD case | `team-live-20261018T055512Z.json` stage 5-mission |
| Cloud database | **Applied and tested** on Supabase `jarvis-actiii-cloud` (empty) | — | Section 3 |
| Cloud AI gateway | Built and tested locally; **not deployed** (owner CLI step) | OpenRouter only; AMD route disabled | `apps/api/test/cloud-gateway.test.ts` |
| Payments | **Simulated everywhere** | — | — |

## 1. Real model requests made by this sprint
| Provider | Requests | Cost | Notes |
|---|---|---|---|
| AMD | about 12 (2 startup probes, 8 for the four orders, 2 for the verifier's repeat order) | within the 1 USD/day endpoint allowance; exact cost not reported by the endpoint | 0 failures, 0 retries, key in files 0 |
| OpenRouter | 20 across five owner runs (2 empty answers from a reasoning-token cap, later fixed) | $0 reported on every call; key limit 0 / free tier | no stop conditions hit |

## 2. Test report (commit of this file)
| Gate | Result |
|---|---|
| API tests (`npm run api:test`) | 354/354 pass |
| Web tests (`npm run web:test`) | 151/151 pass |
| Legacy (`npm run legacy:check`) | 58/58 pass |
| Type check (`tsc -p apps/api`, and web via build) | pass |
| Build | pass |
| Pinned 30-case benchmark (`api:bench:ci`) | 0 unsafe autonomous actions; results file byte-identical |
| Offline no-policy baseline | JARVIS 0/30 unsafe vs no-policy 18/30 (11 unsafe money movements); byte-identical |
| Verifier (`demo:verify`, four orders + abuse checks) | 16/16 |
| Judge Mode browser suite | 12/12 (includes phone width, console errors) |
| Judge reliability | 6/6 |
| AI Team browser suite | 13/13 (mission, HTML injection, keyboard, 375 px) |
| Proof mode / Commerce OS / Merchant platform | 8/8 · 16/16 · 8/8 |
| Adversarial figure check | 19 formats rejected; withheld text never repeats the figure |
| OpenRouter limits (mock provider) | request cap, cost stop, 429/402 stop, no retries, cancellation, staged runs, quota hooks |
| Cloud gateway (fakes + mock provider) | 8/8 |
| Database security on real Postgres (`supabase/tests/security_test.sql`) | 39/39 on `jarvis-actiii-cloud` |
| Live-run scripts (both providers mocked) | full staged run and mission pass; key-leak scan 0 |
| Secret scan (tracked files and built bundle) | no key patterns, no key variable names in the bundle |

Unchanged: refund policy, policy engine, simulated gateway, pinned data and evaluation ground truth.

## 3. Security findings fixed in this sprint
1. **Unverified numbers shown with a warning.** Private replies used to show the number with a warning appended. Now the statement is withheld and the figure is never repeated. The same rule covers findings, proposals, success metrics and notes.
2. **Figure-check gaps.** Scientific notation, magnitude words (`$1.2M`), full-width and other-script digits, spelled-out amounts, percentages that look like small counts or years, and proposal text all got past the check. All are now caught.
3. **No request-count limit.** Free calls often report zero or no cost, so the dollar cap never triggered. There is now a hard request cap counted per dispatch. Any reported cost on a free-only run stops the provider, 429 and 402 stop it without retrying, and requests run strictly one at a time.
4. **Paid or random models could be configured.** A `:free` id is now required, and the startup check confirms the listed price is zero. The `openrouter/free` router is refused.
5. **API server listened on all interfaces.** It now binds to `127.0.0.1` by default.
6. **Database policy recursion.** Sharing a private message to the boardroom failed on real Postgres. The real-database test found it, and migration `20261017203000` fixes it.

Open risks are in `docs/cloud/JARVIS-CLOUD-ARCHITECTURE.md` §8 and `SECURITY-THREAT-MODEL.md`.

## 4. Performance (Judge Mode, cold load)
| | Main JS | gzip | CSS | Transferred on load |
|---|---|---|---|---|
| Production `be52013` | 497,265 B | 138,473 B | 60,812 B | ≈162 KB |
| Candidate | 499,215 B (+0.4%) | 138,964 B | 60,315 B | ≈158 KB |

The AI Team page is a separate lazy chunk (49 KB), loaded only on `#/ai-team`. Load times were measured three times each, but production is remote and the candidate was a local preview, so the timings are not comparable. Only the byte sizes are a like-for-like comparison.

## 5. Release steps (only after owner approval)
1. Choose the scope. **Recommended:** the evidence and docs only, plus the AI Team page in fixture mode, which is already labelled. Live inference must never be public.
2. Merge `feature/actiii-grand-championship` into `claude/kickoff-day1-jkg6ry` with a merge commit, and push.
3. Hosted checks: the API, web and legacy tests, the benchmark CI gate and the build.
4. Deploy that SHA with the Vercel CLI to project `prj_9cLHXOf7792XItjc1ZfSIhXdcVlC`.
5. Verify against production: the verifier (16/16), Judge Mode (12/12), reliability (6/6) and AI Team (13/13). Signed out, the AI Team must show the fixture label and no live controls should work: `/team/*` is not served on Vercel.
6. Report the SHA and the deployment id.

**Rollback:** promote `dpl_5GtjQFYi6ChkCYEmCX9ELsvYB5AP` (`be52013`) with `vercel promote`. Fallbacks are `dpl_BHvrCqExwQAPjcEq9ARc32y5viZD` (87bd523), then `dpl_DHM8iQbPJNcWHhaZPbf9VaS3b6ta`. The cloud database is separate from the site, so a site rollback does not touch it. Database rollback: `supabase/rollback/20261017200000_jarvis_core.down.sql`, after a backup.

## 6. Remaining limitations (exact)
- AMD main stays **PARTIAL** only because the public demo runs fixture AI by design; fresh live evidence exists (17 Oct, 25/25).
- Gemma stays **BLOCKED**: it is not confirmed available, and we have no hardware proof. Evolus stays **BLOCKED**: there is no workspace or Developer Cloud GPU.
- The cloud gateway is not deployed. Its Deno wiring (`supabase-deps.ts`) has not run yet; the gateway logic is tested under Node.
- No backup-and-restore drill has been run against the cloud database.
- There is no sign-in UI in the web app for the cloud backend. The browser AI Team still uses `localStorage` and the local operator token.
- Local-server limits are per process. Durable quotas exist only in the cloud path.
- A figure within 0.5% of a real computed value passes the figure check. The check also cannot stop misleading prose that contains no numbers.
- The AMD key remains exposed and cannot be rotated.
