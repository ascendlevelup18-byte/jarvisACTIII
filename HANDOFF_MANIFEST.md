# JARVIS Cursor Handoff: Manifest

> **HISTORICAL (2026-10-05 Cursor bundle).** Paths and sizes below describe that bundle. Several root files have since moved to `legacy-prototype/` on the canonical branch, so this manifest no longer verifies against the repo. Git history is the integrity record.

## Source

| Field | Value |
|---|---|
| Repository source path | `C:\Users\Lenovo\OneDrive\Desktop\ACT 111 AMD Hackathon` |
| Source HEAD commit | `1beaef14eff95a19c1d77944e89a7a7182654aea` (`1beaef1`, branch `master`) |
| Export method | `git archive 1beaef1` (committed files only), then rearranged as described below |
| Bundle created | 2026-10-05T13:53:31Z |

## Verification (source repo, before packaging)

The source working tree was clean, at HEAD `1beaef1`.

| Command | Result |
|---|---|
| `git status` | nothing to commit, working tree clean |
| `git rev-parse HEAD` | `1beaef14eff95a19c1d77944e89a7a7182654aea` |
| `npm run api:typecheck` | exit 0 |
| `npm run api:test` | 59 tests, 59 pass, 0 fail, 0 cancelled, 0 skipped |
| `npm run api:bench:ci` | exit 0. 30 cases (29 pass, 1 conservative escalation). 0 unsafe. Safe Resolution Rate 96.7%, Correct Escalation Rate 100% (internal, fixture adapters only) |

## Verification (bundle self-test, in a scratch copy of this folder)

`npm ci`, `api:typecheck`, `api:test` and `api:bench:ci` all ran as in the source repo: exit 0, 59/59, CI gate passed. The regenerated results were byte-identical to the bundled file.

A smoke test of `POST /cases` with the valid duplicate returned `RESOLVED` and verified. `OPTIONS /cases` returned 405: there is no CORS support, as documented.

## Layout changes versus the repository

- The repo-root legacy files `src/`, `test/`, `ARCHITECTURE.md` and `README.md` were moved to `legacy-prototype/`. All other repo paths are preserved.
- Three files were added for this handoff: `CURSOR_START_HERE.md`, `CURSOR_UI_BUILD_BRIEF.md` and `legacy-prototype/README_LEGACY.md`. This manifest is the fourth.

## Excluded

- `.git/`, `node_modules/`, `.claude/`, IDE caches, build output and coverage. None of these are tracked, so none were exported.
- Any real `.env`. None exists in the repo; only the placeholder `.env.example` is included.
- Scratch and probe files from the source session, and unrelated downloads.

## Files (65 plus this manifest)

### CURSOR INSTRUCTION (2)

| File | Bytes | SHA-256 (first 16) | Note |
|---|---|---|---|
| `CURSOR_START_HERE.md` | 7784 | `15124fc6b69f79a9` | written for this handoff (not in repo) |
| `CURSOR_UI_BUILD_BRIEF.md` | 5766 | `bf3752919b1fb724` | written for this handoff (not in repo) |
| `HANDOFF_MANIFEST.md` | | | this file |

### AUTHORITATIVE (3)

| File | Bytes | SHA-256 (first 16) | Note |
|---|---|---|---|
| `docs/IMPLEMENTATION_STATUS.md` | 8932 | `3c893deea2ca30e7` |  |
| `docs/JARVIS_ACT_III_BUILD_CONTRACT.md` | 18967 | `64343312c5e08d07` |  |
| `docs/JARVIS_AI_TEAM_OPERATING_SYSTEM.md` | 13790 | `22208fb85f9a9a81` |  |

### CURRENT IMPLEMENTATION (26)

| File | Bytes | SHA-256 (first 16) | Note |
|---|---|---|---|
| `apps/api/README.md` | 2351 | `58d17e2f6256c921` |  |
| `apps/api/eval/dataset.ts` | 7198 | `fbec4e9017559145` |  |
| `apps/api/eval/metrics.ts` | 5727 | `6dd2e9cd400d7680` |  |
| `apps/api/eval/run-benchmark.ts` | 3334 | `6b7e8de0fd8ea1ed` |  |
| `apps/api/eval/runner.ts` | 5844 | `6a002344fe37168f` |  |
| `apps/api/src/case-engine.ts` | 9473 | `284f58e99565573a` |  |
| `apps/api/src/contracts.ts` | 6476 | `9a29e7cf0aa9281c` |  |
| `apps/api/src/evidence.ts` | 7191 | `a30cdd8e25d9b3bf` |  |
| `apps/api/src/fixtures.ts` | 5312 | `8b67d761e401e5ab` |  |
| `apps/api/src/gateway.ts` | 2482 | `de78e260ea769c40` |  |
| `apps/api/src/intent-cues.ts` | 1344 | `9193e9bed5177606` |  |
| `apps/api/src/main.ts` | 981 | `811ca02ec41eafe2` |  |
| `apps/api/src/model-adapter.ts` | 4678 | `1b5f957f407c5ca7` |  |
| `apps/api/src/money.ts` | 2231 | `456db6164a42d99f` |  |
| `apps/api/src/policy-engine.ts` | 6816 | `4953642205093591` |  |
| `apps/api/src/request-understanding.ts` | 2773 | `df04b568bc9cd1d0` |  |
| `apps/api/src/server.ts` | 1857 | `56bf4fa2bab69006` |  |
| `apps/api/src/state-machine.ts` | 1597 | `c06a22c08a8d319f` |  |
| `apps/api/test/benchmark.test.ts` | 8272 | `2db1ece0b0252657` |  |
| `apps/api/test/case-engine.test.ts` | 12513 | `58593632fce456eb` |  |
| `apps/api/test/helpers.ts` | 2377 | `f64c59eeb9512f7f` |  |
| `apps/api/test/policy-engine.test.ts` | 7883 | `ed0ff99e657dfc5a` |  |
| `apps/api/test/review-remediation.test.ts` | 10025 | `3a059b2e52b6179a` |  |
| `apps/api/test/server.test.ts` | 1582 | `e6683bfacb3523d9` |  |
| `apps/api/test/state-machine.test.ts` | 2052 | `3a55f342d3c4f70c` |  |
| `apps/api/tsconfig.json` | 459 | `a3a84c6ce361cc0b` |  |

### EVALUATION (3)

| File | Bytes | SHA-256 (first 16) | Note |
|---|---|---|---|
| `data/cases/duplicate-charge-eval.v1.json` | 36576 | `d5a8b4064b81bf8b` | LOCKED v1 dataset, byte-identical, CI-pinned |
| `evals/baselines/BASELINE-V1.json` | 23027 | `7cc9aa870bee3b37` | BASELINE-V1 snapshot; holds the dataset pin |
| `evals/results/duplicate-charge-eval.v1.json` | 23068 | `b3e86b9140915761` | benchmark output at 1beaef1 |

### BUILD CONFIG (8)

| File | Bytes | SHA-256 (first 16) | Note |
|---|---|---|---|
| `.dockerignore` | 36 | `877371ed78506c3c` | belongs to the legacy prototype |
| `.env.example` | 597 | `30e2600c6bc338ac` | belongs to the legacy prototype |
| `.gitattributes` | 58 | `8480c5b5d6bb83ec` |  |
| `.gitignore` | 36 | `f23dc768f7027c55` |  |
| `Dockerfile` | 285 | `64080e639443d378` | belongs to the legacy prototype |
| `package-lock.json` | 13682 | `d4a21910dabd61b7` |  |
| `package.json` | 863 | `7161e4232cf7ad48` | api:* scripts = current; start/typecheck/test/check = legacy |
| `tsconfig.json` | 451 | `33bcc0d8994db060` | belongs to the legacy prototype |

### LEGACY REFERENCE (23)

| File | Bytes | SHA-256 (first 16) | Note |
|---|---|---|---|
| `legacy-prototype/ARCHITECTURE.md` | 8807 | `aa3ddfbf92f65a2a` | moved from repo root |
| `legacy-prototype/README.md` | 1841 | `df02136d5edb7e3a` | moved from repo root |
| `legacy-prototype/README_LEGACY.md` | 1432 | `ec39a2903b35f8d9` | written for this handoff (not in repo) |
| `legacy-prototype/src/audit.ts` | 1051 | `bf57c976c49a8b27` | moved from repo root |
| `legacy-prototype/src/config.ts` | 1370 | `4f82b33f914a8aed` | moved from repo root |
| `legacy-prototype/src/contracts.ts` | 4859 | `e9cc3ecf8310d744` | moved from repo root |
| `legacy-prototype/src/evidence.ts` | 4425 | `120975b68ae75ae0` | moved from repo root |
| `legacy-prototype/src/gateway.ts` | 2437 | `ae7a2aaf8ebca26b` | moved from repo root |
| `legacy-prototype/src/llm.ts` | 4703 | `9923acd1055cca42` | moved from repo root |
| `legacy-prototype/src/main.ts` | 1529 | `52352490844ff4c7` | moved from repo root |
| `legacy-prototype/src/money.ts` | 1776 | `b1a79cf1f8bb63fd` | moved from repo root |
| `legacy-prototype/src/pipeline.ts` | 9773 | `4f1586671d4b4d6c` | moved from repo root |
| `legacy-prototype/src/policy.ts` | 6394 | `9ec0eba567501976` | moved from repo root |
| `legacy-prototype/src/prompts.ts` | 2749 | `9d6a4b72282bc288` | moved from repo root |
| `legacy-prototype/src/server.ts` | 3137 | `76a4a1616d43b7a2` | moved from repo root |
| `legacy-prototype/src/store.ts` | 4357 | `47d17a6f51c13790` | moved from repo root |
| `legacy-prototype/test/evidence.test.ts` | 3693 | `5ceaa048b0226cb3` | moved from repo root |
| `legacy-prototype/test/helpers.ts` | 3048 | `29fe475ea0b75a16` | moved from repo root |
| `legacy-prototype/test/llm.test.ts` | 4847 | `b9067b74554e52e7` | moved from repo root |
| `legacy-prototype/test/money.test.ts` | 1293 | `1bb4af4e7756c06c` | moved from repo root |
| `legacy-prototype/test/pipeline.test.ts` | 17396 | `df51a8f025a286c4` | moved from repo root |
| `legacy-prototype/test/policy.test.ts` | 3704 | `5ad5f309f4970106` | moved from repo root |
| `legacy-prototype/test/server.test.ts` | 2454 | `16675439d9d6d11e` | moved from repo root |
