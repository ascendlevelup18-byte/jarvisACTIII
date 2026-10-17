# Competitive audit (16 Oct 2026)

Sources: lablab.ai's public ACT III gallery (22 entries visible; ours was not listed in that view, so the field is probably larger), each entry's submission links, and the public READMEs of the strongest repositories. Nothing was copied from them.

Labels: **F** documented fact (their README or submission states it), **O** direct observation (we checked it), **A** assumption, **J** our judgment.

## Matrix

| Entry (track) | Technical innovation | AMD depth | Evaluation credibility | Demo | Weaknesses / unsupported claims |
|---|---|---|---|---|---|
| **Chirak** (Reinvent Commerce) | Task + ~20 examples → frozen eval set → LoRA fine-tune of a 4B model → Claude analyses failures → retrain (F) | Trains on one AMD Instinct GPU (F) | A second task is scored against labels written by people (F) | Stored run reports; CPU playground, no new runs (F) | Live demo cannot train (F); GPU run not reproducible by judges (J) |
| **SortSmart** (Reinvent Commerce) | Rule engine computes every dollar; the LLM writes the advice (F) | README says testing ran on a third-party endpoint; AMD is "a config change" (F) | Not shown (O) | Render demo (O) | AMD use is a plan, not evidence (J) |
| **CertGate** (Industry) | Steel certificate reading checked against versioned spec rules; a person decides (F) | Token Factory; live model list shown in the app (F) | METRICS.md, CLAIMS.md (claim → proof), EVIDENCE-INDEX.md (F) | Judge mode replaying recorded real readings, labelled "not live"; live reading with a judge access code (F) | Strongest presentation of proof in the field (J) |
| **SayAgain** (Industry) | Radio read-back checking; the model points at words, code decides (F) | Token Factory with a receipt per call (F) | 89 held-out exchanges; compares with a plain LLM judge (0 vs 2 wrong read-backs passed) (F) | Static replay, video, pitch page (F) | Scripted text only; no human recordings measured (F) |
| **ClearCare** (Health) | Prescription → plain sheet in 10 languages; doses never reworded; a doctor approves (F) | DeepSeek-V4-Flash on AMD, plus a second model cross-check (F) | 210/211 checks, 0 privacy leaks (F) | Temporary tunnel URL (O) | Demo link may expire (J) |
| **Clearsheet** (Health) | Discharge summary → patient sheet; quote and number checks; nurse releases flagged lines (F) | Gemma on AMD MI300X with vLLM on ROCm (F) | Eight synthetic cases written by the team (F) | Hosted app (O) | Small evaluation set (F) |
| **FactoryPilot** (Industry + Evolus) | Photo + sensor log → cited diagnosis → work order; guardrails the model cannot override (F) | Qwen2.5-VL on MI300X, vLLM + ROCm (F) | Not quantified in README excerpt (O) | Vercel app (O) | — |
| **IncidentLens** | Evidence-bound incident triage; fail-closed citation gate (F) | DeepSeek-V4-Flash on Token Factory (F) | CI badge; no headline benchmark (O) | Deterministic evaluation mode on Vercel (F) | Closest architectural twin to JARVIS, on a smaller problem (J) |
| **T2V** | A diffusion model writes every classifier weight from a text description (F) | Agent on Token Factory; generation on a T4 (F) | Tested on real ImageNet photos (F) | Colab notebook (O) | Main compute is not on AMD (F) |
| **NOAI+** | Redaction gate, signed hash-chained receipts, tamper button (F) | Lists AMD; README describes a Nebius × NVIDIA hackathon build on Nemotron (F) | Tests prove redaction paths (F) | Hosted chat (O) | Looks recycled from another event (J) |

## JARVIS on the four official criteria (internal assessment, not a prediction)

| Criterion | Before this branch | After this branch | Gap to the leaders |
|---|---|---|---|
| Application of Technology | Live AMD-hosted run with a 30-case benchmark; fail-closed provenance checks | + recorded AMD replay a judge can inspect in the product; provenance page | Self-hosted MI300X entries (Clearsheet, FactoryPilot) and Chirak's on-GPU training go deeper on AMD |
| Presentation | Film, deck, Command Center; proof buried in docs | + Judge Mode (three outcomes, authority map, inspectable proof, AMD replay); CLAIMS.md | CertGate's judge mode with a live reading on AMD |
| Business Value | Commerce buyer implied | + named buyer, value model with editable assumptions, pricing and pilot plan | Nobody has customers; SortSmart quantifies dollars more directly |
| Originality | "AI proposes, code decides" is common in this field (at least 8 entries) | + the one differentiator nobody else has: **verified financial-action safety** (record-derived amounts, idempotent execution, read-back) and a measured no-policy comparison | — |

## What we adapted (practices, not content)

1. A judge-facing mode that replays recorded runs and labels them as recorded (CertGate, SayAgain).
2. A comparison against a policy-free baseline on identical cases (SayAgain's plain-LLM comparison).
3. A claims-to-evidence file (CertGate's CLAIMS.md idea), written for our own claims.
4. A headline number in the first screen (ClearCare, SayAgain); the proof-first README on `docs/proof-first-readme` already does this.
