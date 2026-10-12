# Vercel preview: owner setup (fixture-only)

**Goal:** one **preview** deployment of the ACT III branch `claude/kickoff-day1-jkg6ry`, with **no production deployment** and **no deployment of `master`** (`5b5a5fe`, the pre-hackathon baseline).

**Status:**
- `vercel build` (Vercel CLI 63.1.2) of this branch passed locally, and its compiled functions passed the acceptance checks.
- No hosted deployment exists yet.
- The connector in the Claude session gets **403** on project creation, so this step needs the owner's own Vercel login.

## Why not "Import Git Repository" in the dashboard

- A Git-connected project builds the repo's **production branch**, which is `master` here.
- Vercel's MCP docs say a newly linked project creates a deployment *from the production branch* by default.
- `vercel.json`'s `git.deploymentEnabled.master: false` **does not protect `master` today**:
  - Vercel reads `vercel.json` from the commit being deployed, and `master` has no `vercel.json` (it only gains one when PR #1 is merged).
  - The docs describe the field as stopping **commit-triggered** deployments of a branch. They don't say it stops the first deployment on import, or manual, API or CLI deployments.
- So the dashboard import can publish the baseline as production. Avoid it until the production branch can be set first.

## Safe path: Vercel CLI, no Git connection (preview only)

Run on the owner's machine. You need Node ≥ 22 and a Vercel login.

```bash
git clone https://github.com/ascendlevelup18-byte/jarvisACTIII.git && cd jarvisACTIII
git checkout claude/kickoff-day1-jkg6ry          # verify: git rev-parse HEAD
npx vercel@63 login
npx vercel@63 link                               # create a NEW project (e.g. jarvis-act-iii) in team ascend-revoution
                                                 # if asked to connect the Git repository: answer NO
npx vercel@63 deploy                             # no --prod flag → preview deployment only
```

- `vercel deploy` without `--prod` creates a preview; production requires `--prod` or `vercel promote`. **Do not use either.**
- `vercel.json` supplies the install, build, output and function settings. The framework stays unset ("Other").
- **Add no environment variables:**
  - `JARVIS_AI_MODE` unset means fixture.
  - `JARVIS_CASES_TOKEN` unset means free text is disabled.
  - Never add `JARVIS_MODEL_*`.
  - If someone sets `JARVIS_AI_MODE=vllm`, the serverless handler refuses cases (503); it never serves real-model inference.
- **Deployment protection:** previews use the team default, typically Vercel Authentication. For judges, either share a protection-bypass link or turn protection off for previews only.

## Acceptance checks (against the preview URL)

```bash
U=https://<preview-host>
curl -s $U/api/health                                    # aiMode "fixture", remoteModel false, paymentGateway "simulated"
for b in \
 '{"customerId":"CUST-1001","orderId":"48291","message":"I was charged twice for order #48291."}' \
 '{"customerId":"CUST-1002","orderId":"48292","message":"I was charged twice for order #48292. Please refund the $250 you took."}' \
 '{"customerId":"CUST-1003","orderId":"48293","message":"You charged me twice on order #48293, I want my money back."}' ; do
  curl -s -X POST $U/cases -H 'content-type: application/json' -d "$b" | jq -r .state     # RESOLVED / ESCALATED / CLOSED_NO_ACTION
done
curl -s -o /dev/null -w '%{http_code}\n' -X POST $U/cases -H 'content-type: application/json' \
  -d '{"customerId":"CUST-1001","orderId":"48291","message":"refund me $5000"}'           # 403 (free text disabled)
```

The fourth demo is the prompt-injection message. Use the UI button, or the exact text in `apps/api/src/fixtures.ts`; expect `ESCALATED`.

Then check:
- Run every demo twice; each run must give the same state with a new `x-jarvis-demo-run` header.
- Open the app in a browser and click all four demo buttons.

## Later: connecting Git safely (only if wanted)

Connect the repo to Git only after doing one of these first:
- In Project → Settings → Git, set the **production branch** to `claude/kickoff-day1-jkg6ry`.
- Add an Ignored Build Step that exits 0 (skips the build) for `master`.

Confirm in the dashboard that no production deployment was created.
