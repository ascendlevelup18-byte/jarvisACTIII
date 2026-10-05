# JARVIS — AMD ACT III BUILD CONTRACT
**Version:** 1.0  
**Competition:** AMD Developer Hackathon: ACT III  
**Operating date:** 5 October 2026  
**Objective:** Build a submission that is objectively capable of winning the main challenge and the Evolus Business Agents on AMD partner track.

---

## 0. NON-NEGOTIABLE STRATEGY

We are not building “an AI customer support chatbot.”

We are building:

# JARVIS
## Autonomous Commerce Operations Agent

**Positioning:**  
**JARVIS turns messy commerce exceptions into verified actions.**

The product receives a real operational exception, gathers evidence, reasons over policy and business state, proposes a decision, passes the proposal through deterministic authorization, executes a permitted action, independently verifies the result, and escalates when evidence is contradictory, incomplete, high-risk, or outside its authority.

The judging moment we are engineering toward is:

> “This is not another agent that talks. It actually closes the operational loop — and it knows when not to act.”

---

## 1. CURRENT VERIFIED COMPETITION FACTS

Official ACT III page:
https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii

Live dashboard:
https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii/live

Current official information:
- Hybrid event.
- Online phase begins 12 October 2026.
- On-site phase: 17–18 October 2026 in Rome, Milan, and Imperia.
- Final submission deadline: 18 October 2026 at 15:00 UTC.
- Official prize pool currently listed as $12,000+.
- AMD prizes: $5,000 total.
- Google prizes: $5,000 total.
- Evolus Business Agents prizes: 1st/2nd/3rd with plan/credit awards.
- Vibe Generation special prize: AirPods 5 for every team member of the winning solution.
- Teams: 1–6 people.
- Every project must run a meaningful part of its workload on AMD infrastructure/hardware.
- The AMD component must be part of the working product shown to judges.
- Main judging dimensions: Application of Technology, Presentation, Business Value, Originality.
- A project may qualify for the main challenge and eligible partner prizes.
- Public GitHub repository, hosted demo/application URL, video presentation, slide presentation, cover image, descriptions and technology/category tags are required.
- Evolus partner challenge requires:
  - free event workspace
  - main agent using an open model served through our own vLLM endpoint on AMD Developer Cloud
  - at least two Evolus building blocks
  - Evolus driven from our app via APIs
  - containerized app
  - public GitHub repository
  - runnable README
  - secrets only through environment variables

Important schedule discrepancy:
- Event page shows online phase 12–18 October.
- Live dashboard currently says online build 12–17 October with submission closing 18 October.

**Our rule:** feature freeze by 17 October. 18 October is submission and recovery buffer.

---

## 2. PRIMARY TRACK

# Reinvent Commerce

Why:
- The brief explicitly asks for products that turn customer/business data into a useful commercial recommendation or action.
- It rewards measurable effects on service quality, revenue, margin, conversion, retention, or inventory.
- JARVIS directly turns support + order + payment + policy data into an operational action.
- It aligns naturally with the Evolus Business Agents on AMD partner challenge.

---

## 3. PRODUCT THESIS

Most AI assistants:

INPUT → RESPONSE

Typical “agents”:

INPUT → TOOL CALL → RESULT

JARVIS:

INPUT  
→ UNDERSTAND  
→ RETRIEVE EVIDENCE  
→ REASON  
→ PROPOSE DECISION  
→ POLICY / PERMISSION CHECK  
→ ACT  
→ VERIFY  
→ ESCALATE IF NEEDED  
→ AUDIT

**Critical separation:**
- AI proposes.
- Deterministic systems authorize.
- Tools execute.
- Independent checks verify.
- Humans own uncertain/high-risk cases.

---

## 4. EXACT USER

**Primary user:** ecommerce operations/support specialist.

They handle:
- duplicate-charge complaints
- refund exceptions
- missing or conflicting order/payment evidence
- policy-bound support decisions
- cases that require escalation

The hackathon version does not target “all businesses” or “every operations team.”

---

## 5. HERO BUSINESS PROBLEM

A customer says:

> “I was charged twice for order #48291.”

Available evidence:
- customer message
- invoice PDF
- order record
- payment transactions
- company refund policy
- prior refund state

Today a human must:
1. read the complaint
2. inspect order/invoice
3. inspect payment history
4. locate the correct policy
5. compare evidence
6. determine whether a duplicate charge exists
7. calculate/validate permitted refund
8. perform the action
9. confirm it succeeded
10. document the case

JARVIS should operate that complete chain.

---

## 6. HERO DEMO — SAFE SUCCESS

### Inputs
Customer:
“I was charged twice for order #48291.”

Order:
- total: $89.99

Transactions:
- CHARGE-A: $89.99, successful
- CHARGE-B: $89.99, successful

Policy:
- verified duplicate charges can be refunded automatically below the configured authority threshold
- order must remain fully paid
- no conflicting evidence may exist

### JARVIS experience
1. CASE RECEIVED
2. EXTRACTING
3. EVIDENCE GATHERING
4. POLICY RETRIEVAL
5. ANALYZING
6. DECISION PROPOSED
7. POLICY VALIDATION
8. APPROVED
9. EXECUTING
10. VERIFYING
11. RESOLVED

### Judge-visible result
**AI recommendation:** refund verified duplicate charge.  
**Policy gate:** all authorization rules passed.  
**Action:** refund workflow executed.  
**Verification:** provider state confirms refund.  
**Audit:** evidence, rules, action and outcome recorded.

---

## 7. SECOND KILLER DEMO — REFUSAL / ESCALATION

Customer requests:
- $250 refund

Verified transaction:
- $180

Policy:
- evidence conflict prohibits autonomous refund

JARVIS must show:

# ACTION BLOCKED

Reasons:
- requested amount conflicts with verified payment
- autonomous authority boundary not satisfied
- evidence is insufficient/contradictory

Then:

# ESCALATED TO HUMAN

This is not a fallback embarrassment. This is a product differentiator.

---

## 8. COMPETITION-SCOPE PRODUCT SURFACES

### 8.1 Command Center
Shows:
- active cases
- resolved cases
- escalated cases
- safe-resolution rate
- unsafe-action count
- agent / AMD status

### 8.2 Case Workspace
Three-column mental model:
- **Inputs / Evidence**
- **JARVIS operational flow**
- **Decision / Authorization / Outcome**

### 8.3 Evidence Panel
Shows:
- customer message
- invoice fields
- order record
- transaction records
- retrieved policy sections
- source identifiers

### 8.4 Decision Panel
Clearly separates:
- AI proposal
- deterministic authorization
- risk / confidence
- evidence used

### 8.5 Execution + Verification
Shows:
- action requested
- tool/workflow invoked
- response
- independent read-back / state verification

### 8.6 Escalation
Shows:
- why JARVIS refused
- conflict(s)
- evidence
- recommendation for human
- required human choice

### 8.7 Audit Timeline
Chronological record:
- ingestion
- retrieval
- reasoning
- validation
- authorization
- execution
- verification
- escalation/resolution

### 8.8 Benchmark Panel
Only real measured numbers.

---

## 9. ARCHITECTURE

```text
                        JARVIS WEB UI
                              |
                              v
                         JARVIS API
                              |
                              v
                         CASE ENGINE
                              |
            +-----------------+------------------+
            |                 |                  |
            v                 v                  v
    Evolus Extractor   Evolus Knowledge    Commerce Data
        (invoice)          Library         (orders/payments)
            |                 |                  |
            +-----------------+------------------+
                              |
                              v
                     STRUCTURED EVIDENCE
                              |
                              v
                    AMD DEVELOPER CLOUD
                              |
                         AMD INSTINCT
                              |
                            ROCm
                              |
                            vLLM
                              |
                       OPEN AI MODEL
                              |
                              v
                    DECISION PROPOSAL
                              |
                              v
                  DETERMINISTIC POLICY GATE
                     /                    \
                 ALLOW                    BLOCK
                   |                        |
                   v                        v
           Evolus Workflow            HUMAN REVIEW
                   |
                   v
            BUSINESS ACTION
                   |
                   v
              VERIFY STATE
                   |
                   v
             AUDIT + RESULT
```

---

## 10. AMD ROLE

AMD is the intelligence infrastructure, not a logo.

Required final chain:
AMD Developer Cloud  
→ AMD GPU  
→ ROCm  
→ vLLM  
→ open model  
→ real JARVIS reasoning request

Judge-visible evidence should include:
- endpoint/provider
- model
- accelerator
- runtime
- latency
- request/response tracing where safe
- benchmark results

Local models through Colibri are **development-only** and do not satisfy the final AMD requirement.

---

## 11. EVOLUS ROLE

Target meaningful use:

### Component 1 — Document Extractor
Invoice/PDF → strict structured fields.

### Component 2 — Knowledge Library
Company policies → grounded policy retrieval with sources.

### Component 3 — Workflow
Authorized resolution → controlled business workflow.

Potential optional additions:
- webhooks
- MCP connector
- agent/sub-agent

Only add an optional component if it visibly improves the product or partner judging score.

Evolus must be invoked from JARVIS through the official API and must appear in real event-workspace usage statistics.

---

## 12. AI / DETERMINISTIC BOUNDARY

### AI may:
- understand unstructured user intent
- classify exception type
- synthesize evidence
- reason about possible resolution
- select evidence references
- propose structured action
- express uncertainty

### AI may NOT:
- invent transaction amounts
- choose arbitrary monetary values
- bypass company policy
- directly invoke financial actions without authorization
- override permission boundaries
- mark its own action verified
- silently ignore contradictions

### Deterministic code owns:
- money arithmetic
- currency matching
- IDs and ownership
- authority thresholds
- schema validation
- policy invariants
- action permission
- idempotency
- final tool invocation
- outcome verification
- state transitions

---

## 13. STATE MACHINE

Target visible states:

RECEIVED  
→ EXTRACTING  
→ EVIDENCE_GATHERING  
→ ANALYZING  
→ DECISION_PROPOSED  
→ POLICY_VALIDATION  
→ APPROVED  
→ EXECUTING  
→ VERIFYING  
→ RESOLVED

Safe alternate exits:
- ESCALATED
- CLOSED_NO_ACTION
- FAILED

Rules:
- EXECUTING cannot happen without APPROVED.
- RESOLVED cannot happen without successful verification.
- contradictory/stale/insufficient evidence fails closed.
- every state transition emits an audit event.
- terminal states cannot transition further.

---

## 14. TRUST / RELIABILITY REQUIREMENTS

Mandatory:
- strict runtime validation of model outputs
- prompt-injection-resistant separation of instructions vs untrusted data
- document text treated as untrusted
- idempotent business actions
- stale-state revalidation immediately before sensitive action
- timeout handling
- read-back verification after action
- secrets in environment variables
- explicit permissions
- no silent catches
- audit event for every business-critical transition
- no fake success states

High-value adversarial cases:
- customer prompt injection
- invoice/document prompt injection
- wrong customer/order
- currency mismatch
- already-refunded charge
- partial refund
- stale payment state
- three identical charges
- malformed AI output
- AI timeout
- provider timeout but action succeeded
- provider timeout and action did not occur

---

## 15. BENCHMARK CONTRACT

Build a controlled 30-case dataset:

- 10 straightforward
- 10 ambiguous
- 5 contradictory
- 5 adversarial/edge

Primary metric:

# Safe Resolution Rate

Correct automatic resolutions + correct escalations  
divided by total cases

Also measure:
- decision correctness
- correct escalation
- unsafe autonomous action rate
- extraction accuracy
- workflow success rate
- verification success rate
- end-to-end latency
- model inference latency
- human intervention rate

Most severe failure:
**Ground truth says ESCALATE, but JARVIS acts autonomously.**

Never invent benchmark values.

---

## 16. PRODUCT VISUAL DIRECTION

JARVIS must look like:
- serious operational software
- premium early-stage startup
- calm, precise, high-trust
- visible state transitions
- information-dense but legible

JARVIS must NOT look like:
- ChatGPT clone
- cyberpunk HUD
- crypto dashboard
- template admin panel
- “AI assistant” chat screen

Hero visual:
A case visibly moves from messy input to evidence, authorization, action and verified resolution.

---

## 17. NON-SCOPE

Do NOT build during ACT III:
- general JARVIS OS
- personal assistant
- voice assistant
- browser agent
- HR workflows
- procurement
- sales agent
- full finance automation
- ASCEND integrations
- multi-tenant billing
- complex authentication
- mobile app
- dozens of integrations
- speculative multi-agent swarm
- database architecture for its own sake
- features that do not appear in demo or judging story

One workflow. Exceptional execution.

---

## 18. REPOSITORY TARGET

```text
jarvis-amd-act-iii/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── contracts/
│   ├── case-engine/
│   ├── policy-engine/
│   ├── model-adapter/
│   ├── evolus/
│   └── benchmark/
├── data/
│   ├── company/
│   ├── policies/
│   └── cases/
├── evals/
├── docs/
├── scripts/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitattributes
├── README.md
└── LICENSE
```

This is a target, not permission to create every directory before it is needed.

---

## 19. PRE-KICKOFF PHASE — OCT 5–11

Goal: remove uncertainty without building the competition-defining product prematurely.

### P0 — Local model validation
- install/run Colibri model
- expose local API
- validate structured JSON on 3 JARVIS cases
- record failure modes

### P1 — Freeze contracts
Create:
- PRODUCT.md
- ARCHITECTURE.md
- COMPETITION.md
- EVALS.md

### P2 — Synthetic company
Prepare:
- customers
- orders
- payments
- invoices
- refund policy
- escalation policy
- 30 expected-result eval cases

### P3 — AMD readiness
Learn:
- Developer Cloud access path
- ROCm/vLLM deployment
- endpoint format
- model candidates
- benchmark procedure

### P4 — Evolus readiness
Learn:
- REST authentication
- extractor API
- knowledge libraries
- workflow execution
- event workspace process
- MCP tools if useful

### P5 — UI design
Prepare:
- wireframes
- design tokens
- interaction states
- demo storyboard

Do not build the core competition agent until the event window if event rules require the core AI functionality to be created during the hackathon.

---

## 20. COMPETITION EXECUTION — OCT 12–18

### Oct 12 — CORE LOOP
Definition of done:
one real case flows:
input → evidence → AMD model → structured decision → deterministic validation

### Oct 13 — EVOLUS
Definition of done:
real Evolus event workspace + minimum two meaningful components + real API traces

### Oct 14 — ACTION / VERIFICATION / ESCALATION
Definition of done:
safe success case + blocked/escalated case both work end-to-end

### Oct 15 — EVALS
Definition of done:
30-case harness runs unattended and outputs real metrics

### Oct 16 — PRODUCT / UI
Definition of done:
judge-ready command center + case workspace + audit + benchmark presentation

### Oct 17 — FREEZE
No new product features.
Only:
- test
- fix
- benchmark
- deployment
- backup recordings
- README
- slides
- video

### Oct 18 — SUBMIT
Only:
- compliance audit
- secrets scan
- final URLs
- repo check
- final video/pitch
- submission fields
- submit well before 15:00 UTC

---

## 21. DEMO STORY (<5 MIN)

0:00–0:15  
“Businesses do not only have questions. They have exceptions that must be resolved.”

0:15–0:30  
Show messy duplicate-charge case.

0:30–2:00  
JARVIS success flow:
evidence → policy → decision → authorization → action → verification.

2:00–2:50  
Second case: conflicting evidence → ACTION BLOCKED → human escalation.

2:50–3:30  
Show architecture:
AMD + ROCm + vLLM + open model + Evolus components.

3:30–4:10  
Show benchmark:
safe resolution, unsafe-action rate, latency, correct escalation.

4:10–4:35  
Business value and commercial expansion.

4:35–4:50  
Close:
“AI assistants answer. JARVIS resolves — and knows when not to act.”

---

## 22. PITCH THESIS

Businesses already have data.
Their problem is operational closure.

JARVIS is the layer that:
- understands exceptions
- assembles evidence
- reasons with an AMD-hosted model
- applies deterministic policy
- executes through Evolus
- verifies the world changed
- escalates when it should not act

This is not generic automation.
This is **controlled autonomous operations**.

---

## 23. WIN CONDITIONS

We are contender-level only if all are true:

- working deployed product
- real AMD inference
- real ROCm/vLLM endpoint
- genuine Evolus integration
- successful end-to-end resolution
- deliberate escalation case
- deterministic policy gate
- independent verification
- complete audit trail
- 30-case benchmark
- real measured metrics
- polished UX
- public reproducible repo
- Docker verified
- no secrets
- excellent README
- <5-minute killer demo
- sharp deck
- understandable value in <30 seconds

---

## 24. FAILURE CONDITIONS

We are not allowed to lose because:
- AMD was decorative
- Evolus was bolted on
- the demo was a chatbot
- a model output controlled money directly
- the demo broke
- the repo did not run
- Docker was untested
- metrics were fabricated
- UI hid the actual operational mechanism
- we overbuilt
- we changed concept mid-event
- we spent the last day adding features
- the pitch failed to show why JARVIS is different

---

## 25. OPERATING PRINCIPLE

**Working functionality > technical theatre.**  
**Evidence > claims.**  
**Fix > add.**  
**Polish > rebuild.**  
**One exceptional workflow > ten incomplete workflows.**  
**Judges must see JARVIS operate, not hear us describe what it could someday do.**
