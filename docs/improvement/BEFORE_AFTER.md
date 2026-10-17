# Before and after (branch `improve/actiii-judge-experience`)

| What a judge sees | Before (submitted) | After (this branch) |
|---|---|---|
| Where to start | Command Center, with no guided path | **Judge Mode** (`#/judge`), first in the navigation: five numbered sections, about three minutes |
| The three outcomes | Run one order at a time in the Command Center | One button runs all three; each card shows money moved, policy and read-back, with "Inspect why" |
| Who decides | Stated in docs and the film | An on-page authority map: two AI steps with no authority, six deterministic steps |
| AMD evidence | JSON files and `docs/AMD_EVIDENCE.md` | In the product: model requested vs served, endpoint, probes, per-call latency, call-by-call replay, benchmark with caveats, linked files; labelled recorded, not live |
| Why the policy layer matters | Asserted | Measured offline: 0 vs 18 unsafe outcomes on identical proposals, shown on the page and reproducible with `npm run api:baseline` |
| Money-path tests | Concurrency on different charges, retry after timeout, throwing read-back | + identical races (2 and 5 cases), replays, five kinds of dishonest read-back, gateway error, zero gateway calls for unsafe requests |
| Claims | Spread across README, deck and docs | `CLAIMS.md`: every claim with its type, evidence file and reproduce command |
| AMD provenance | Endpoint caveat inside `AMD_EVIDENCE.md` | `docs/improvement/AMD_PROVENANCE.md`: what ran on AMD, what ran locally, measured latencies, open questions |
| Business case | Benchmark facts and a sensitivity table | Named buyer, workflow before/after, editable value model, pricing hypothesis, 30-day pilot, deployment requirements |
| Known issues | Undocumented | `SECURITY_REVIEW.md`: F-1 (racing identical cases all report RESOLVED for one refund), F-2, C-1 (unrotated key) |
| Tests | API 291, web 81 | API 307, web 88, Judge Mode browser 9/9 |

Unchanged by design: the engine, policy, gateway, ingress, the dataset and its pin, the fixture benchmark result, the deployed production build, and the lablab.ai submission.
