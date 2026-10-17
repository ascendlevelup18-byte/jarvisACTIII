# JARVIS ACT III — Final engineering strike report

15 Oct 2026. VERIFIED unless marked. No paid model calls, no push, no deploy, no frontend or `.gitignore` changes.

## A. Repository
- Branch `claude/kickoff-day1-jkg6ry`; started at `7f6072d` (9 ahead of `origin` `4b0e9cc`, 0 behind by local tracking). New commits: `3405fde` (tests + hero tooling), docs commit with this report.
- Untouched and uncommitted: Work's 22 modified + 6 new `apps/web` files (last modified 10:04 local; `CommandCenter.tsx` exists, no "frontend frozen" declaration seen), user `.gitignore`.

## B. Tests
| Suite | Result |
|---|---|
| `npm run api:test` | 272/272 (265 + 7 new) |
| `npm run web:test` | 74/74 (Work's tree, read-only) |
| `npm run legacy:check` | 58/58 |
| `npm run api:typecheck` | pass |
| `npm run api:bench:ci` | 29/30, 20/20 escalations, **0 unsafe**, CI gate passed |
| `film.mjs check` + film tests | pass, 14/14 |
| `npm run demo:verify` (fixture) | 13/13 earlier today; hero script 3/3 now |

## C. AI
- AMD-only (DeepSeek-V4-Flash) is the submission path; offline preflight 7/7; new test proves AMD-only starts when the endpoint drops Gemma.
- Historical live AMD (14 Oct, REPORTED): 17/17 real-model demo checks; benchmark 26/30 exact, 0 unsafe.
- Gemma: not served by the endpoint since run `tg-1`; opt-in, off by default; no Gemma or Google claim anywhere.
- No paid calls this session.

## D. Hero demos (fixture, `evals/results/hero-evidence-fixture-20261015.json`)
- #48291 RESOLVED · APPROVE · simulated refund 8,999 minor · read-back verified · 16 audit events.
- #48294 ESCALATED · DENY (`NO_CONTRADICTIONS` failed) · no execution · 10 events.
- #48293 CLOSED_NO_ACTION · NO_ACTION · no execution · 10 events.
- Reproduce: `docs/submission/HERO_EVIDENCE_MAP.md`.

## E. Integration readiness
`docs/submission/COMMAND_CENTER_CONTRACT.md`: 3 real endpoints, Decision Journey → `Case` fields, provenance sources, error codes, gaps (no case list/get, no approve, no merchant commands, browser-only history). After Work freezes: map each UI value to the contract, run all suites, commit frontend separately.

## F. Blockers (ranked)
CRITICAL: no video/MP4; no anonymous demo URL; repo private. HIGH: frontend not frozen/integrated (old screenshots in deck); AMD key not rotated. MEDIUM: deadline unconfirmed; Gemma unavailable. LOW: FFmpeg missing. Details: `RELEASE_PROCEDURES.md`.

## G. Changes
| File | Why | Covered by |
|---|---|---|
| `apps/api/test/safety-invariants.test.ts` (new) | Invariants 1, 5, 6, 7 checked across all 30 cases at once | itself (6 tests) |
| `apps/api/test/ai-startup.test.ts` | Invariant 10: AMD-only starts when Gemma is not listed | 1 new test |
| `scripts/hero-evidence.mjs` (new) | Reproducible Decision Journey evidence for the 3 hero cases | run against a fixture API, 3/3 |
| `evals/results/hero-evidence-fixture-20261015.json` (new) | Fixture evidence artifact | — |
| `docs/submission/HERO_EVIDENCE_MAP.md`, `COMMAND_CENTER_CONTRACT.md` (new); `RELEASE_PROCEDURES.md` (blockers + rollback) | Judge evidence map; frontend contract; release plan | grounded in the files above |

## H. Owner actions
1. Freeze the frontend (Work) and say "integrate".
2. Record R1–R7 + narration (`video-production/film/README.md`).
3. Approve: push, preview deploy with judge access, public repo.
4. Rotate the AMD key.
5. Ask organizers for the deadline (and whether Gemma returns).
