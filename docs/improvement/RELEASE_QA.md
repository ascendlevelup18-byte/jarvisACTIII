# Release QA: `improve/actiii-judge-experience` (17 Oct 2026)

## Gate A: integrated release candidate

| Item | Value |
|---|---|
| Branch | `improve/actiii-judge-experience` (55 files changed against the submitted `1aa5a52`) |
| Integrated | `docs/proof-first-readme` (`64d66c3`), `post-submission/audit-hardening-2026-10-16` (`952777b`) |
| Submitted branch | `claude/kickoff-day1-jkg6ry` at `1aa5a52`, unchanged |
| Production | `https://jarvis-actiii-preview.vercel.app`, unchanged; anonymous `demo:verify --fixture` 21/21 on 17 Oct |

| Check | Result |
|---|---|
| Hosted CI on the branch (typecheck, API, web, build, legacy, benchmark gate, drift) | pass (run 39018370685 on `25ee84d`; later commits are docs, e2e and the live-gate switch) |
| `npm run api:typecheck` | pass |
| `npm run api:test` | 323/323 (money path, replay accounting, state machine, body limit, ingress, model output, idempotency, baseline) |
| `npm run web:test`, build, `oxlint` | 89/89, pass, pass |
| `npm run legacy:check` | 58/58 |
| `npm run api:bench:ci` + drift check | 29/30, 0 unsafe; `data/` and `evals/` unchanged |
| `npm run api:baseline` | reproduces the committed file exactly |
| Browser: `judge-mode.e2e.mjs` | 9/9 (four cases, AMD evidence, inspect, keyboard, reduced motion, 375 px, no console errors) |
| Browser: `proof-mode`, `merchant-platform`, `commerce-os` | 8/8, 8/8, 16/16 after updating selectors to the redesign (were 2/8, 1/8, crashed) |
| `demo:verify --fixture` (local, through Vite) | 21/21 |
| `npm audit`, tree and bundle secret scans | 0 vulnerabilities, 0 hits, no source maps |

## Gate B: production readiness (preview, not production)

Preview `https://jarvis-actiii-preview-k4syx2628-ascend-revoution.vercel.app` (`dpl_3VzGTeLSHsUnVxBqNVjN1tVnMj6T`), behind Vercel Authentication, checked with `vercel curl`:

| Check | Result |
|---|---|
| Vercel project environment variables | none (no key, no operator token) |
| `/api/health` | fixture AI, `remoteModel: false`, simulated gateway, synthetic data, free text disabled |
| #48291 | RESOLVED · APPROVE · ACCEPTED · `replayed: false` · verified · 16 audit events |
| #48294 | ESCALATED · DENY · no action · 10 events |
| #48293 | CLOSED_NO_ACTION · NO_ACTION · no action · 10 events |
| #48292 | ESCALATED · DENY · no action · 10 events |
| Free text without token | 403 |
| 70 KB body | 413 |
| Index | served |

Not checked on the preview: the browser UI (the preview requires a Vercel login). The same build passed the browser suites locally.

## Known limitations

- Payments simulated, data synthetic, one automation live; review queue is read-only.
- Idempotency is per world; in-memory limits are per serverless instance.
- No live-model run of the no-policy baseline; the offline result uses the fixture proposer.
- AMD key from 14 Oct not rotated (owner action); not used.

## Gate C: owner approval needed

1. Merge `improve/actiii-judge-experience` into `claude/kickoff-day1-jkg6ry` (fast-forward not possible; a merge commit, no force push).
2. Deploy that commit to production (`vercel deploy --prod`), then run Gate D: anonymous `demo:verify --fixture` on production, the four scenarios, Judge Mode e2e with `BASE_URL` set to production, console and mobile checks.
3. Update lablab.ai metadata (tags, demo link `#/judge`) after the deploy.
4. Replace slides, video and cover after the media refresh is reviewed (`MEDIA_HANDOVER.md`).

Rollback: production can be promoted back to the current deployment (`jarvis-actiii-preview-apq0f2oi3`) in the Vercel dashboard; the merge can be reverted with a revert commit.
