# Release QA: `improve/actiii-judge-experience` (16 Oct 2026)

Base: `1aa5a52` (submitted branch head; code identical to the deployed `9c7a707`/`06f78f5`). Nothing on this branch is merged, deployed or attached to the lablab.ai submission.

## Results (all run on the branch head, Windows 11, Node 24)

| Check | Baseline (`1aa5a52`) | This branch |
|---|---|---|
| `npm run api:typecheck` | pass | pass |
| `npm run api:test` | 291/291 | **307/307** (+16 money-path and baseline tests) |
| `npm run web:test` | 81/81 | **88/88** (+7 evidence-fidelity tests) |
| `npm run legacy:check` | 58/58 | 58/58 |
| `npm run web:build` + `oxlint` | pass | pass (Judge Mode chunk 18.6 kB, lazy-loaded) |
| `npm run api:bench:ci` | 29/30, 0 unsafe | 29/30, 0 unsafe |
| `git diff --exit-code -- evals data` after the benchmark | clean | clean |
| `npm run api:baseline` reproduces the committed file | n/a | identical (also asserted by a test) |
| `npm run demo:verify` (local API, and through the Vite proxy) | 13/13 | 13/13 and 13/13 |
| `apps/web/e2e/judge-mode.e2e.mjs` (new) | n/a | **9/9**: labels, three outcomes, inspect, AMD replay values, keyboard reachability, reduced motion, 375 px with no horizontal scroll, no console errors |
| Older browser suites (`proof-mode`, `merchant-platform`) | 2/8 and 1/8 | 2/8 and 1/8: **pre-existing failures**; their selectors predate the 16 Oct redesign (also noted in the post-submission audit). Not caused by this branch. |
| `npm audit` (root, web) | 0 vulnerabilities | 0 vulnerabilities |
| Secret scan: tree, bundle, source maps | 0, 0, none | 0, 0, none |

Screenshots of the new page (desktop and 375 px) were taken by the e2e run; they are not committed.

## Judge-critical behaviour

- The three canonical outcomes are unchanged: #48291 RESOLVED with a verified $89.99 simulated refund; #48294 ESCALATED, policy DENY, $0; #48293 CLOSED_NO_ACTION, $0.
- Judge Mode sends requests only when `/api/health` reports fixture AI and simulated payments (`canRunFixture`), so it cannot trigger paid inference.
- The recorded AMD section is labelled "Recorded AMD-hosted inference — not a live model call", and a test keeps each value identical to `evals/results/*.json`.
- The no-policy comparison is labelled as an offline fixture-proposer result, not an AMD or real-model result.
- Fixture and simulation labels stay visible in the header and on the page.

## To ship (each needs the owner)

1. Decide on the two concurrent branches (`docs/proof-first-readme`, `post-submission/audit-hardening-2026-10-16`) and merge order. The audit branch also fixes the CI failure on the submitted branch.
2. Check the event rules on post-submission changes. If allowed: merge to the default branch, then `vercel deploy --prod` (or preview first).
3. After a deploy: `npm run demo:verify -- https://jarvis-actiii-preview.vercel.app` and the Judge Mode e2e with `BASE_URL` set to the production URL.
4. Optional, paid: rotate the AMD key, then run the live no-policy baseline (`docs/improvement/BASELINE_EXPERIMENT.md`).

## Submission update proposal (for the owner; not applied)

- Slides: replace the uploaded PDF with `docs/submission/deck/jarvis-deck.pdf` (slide 5 corrected). Confirmed: the uploaded PDF is Work's original (SHA-256 prefix `E32C67DC`), with the old slide 5.
- Tags: change "DeepSeek V3" to DeepSeek-V4-Flash (if the tag list allows); drop "Agent Builder track - The INTERNET OF AGENTS".
- Demo link, after a deploy: `https://jarvis-actiii-preview.vercel.app/#/judge`.
- Description, one added sentence: "On the same 30 adversarial cases, removing JARVIS's policy layer turns 0 unsafe outcomes into 18 (offline, fixture proposer); with it, the live AMD-hosted model made 0 unsafe autonomous actions."
- The video: confirmed attached and playing on the submission page.
