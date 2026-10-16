# Priority matrix (judging impact per hour)

| # | Item | Criterion helped | Impact | Effort | Risk | Status |
|---|---|---|---|---|---|---|
| 1 | Judge Mode with the three outcomes, authority map, inspectable proof and the recorded AMD replay | Presentation, Application of Technology | High | M | Low (new page, existing API) | **Done** on this branch; needs a deploy to be visible |
| 2 | No-policy baseline on identical cases | Originality, Business Value | High | M | Low (offline) | **Done offline**; live run needs approval and a new key |
| 3 | Money-path tests: races, replays, dishonest read-backs | Application of Technology | Medium | S | None | **Done** (16 tests) |
| 4 | CLAIMS.md and an evidence index | Presentation | Medium | S | None | **Done** |
| 5 | Proof-first README | Presentation | High | M | Conflicts with `docs/proof-first-readme` | **Held**: that branch already has it; merge decision with the owner |
| 6 | Fix CI on the submitted branch (PowerShell 7 header formatting) | Presentation (red CI badge) | Medium | S | Touches the submitted branch | Fixed on `post-submission/audit-hardening-2026-10-16`; merge decision with the owner |
| 7 | AMD provenance and business case docs | Application of Technology, Business Value | Medium | S | None | **Done** |
| 8 | F-1: only the creating case may resolve a shared refund | Application of Technology | Low | M | Touches the engine's execution step | Proposed; needs approval |
| 9 | Live no-policy baseline on the AMD model | Originality, Application of Technology | High | S (run) | Paid calls; key rotation first | Waiting on owner |
| 10 | Self-hosted vLLM on an AMD MI300X | Application of Technology | High | L | GPU access, time, demo stability | Not started; runbook exists |
| 11 | Production deploy of this branch | All | High | S | Changes what judges see during judging | Waiting on owner and event rules |
