#!/usr/bin/env node
// Captures the three hero cases (#48291, #48294, #48293) from a RUNNING JARVIS API as a non-secret
// "decision journey" evidence JSON: investigation → decision → control → outcome → proof.
//   node scripts/hero-evidence.mjs [base-url] [--out <file>]     (default http://127.0.0.1:3000)
// Uses only the public canonical demo requests; payments are simulated. Prints a summary and exits
// non-zero if any hero case misses its expected outcome. Provenance comes from /api/health.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const OUT = outAt === -1 ? null : args[outAt + 1];
const BASE = (args.find((a, i) => !a.startsWith("--") && i !== outAt + 1) ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const EXPECTED = { 48291: "RESOLVED", 48294: "ESCALATED", 48293: "CLOSED_NO_ACTION" };

const get = async (path) => (await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(30_000) })).json();
const post = async (body) => {
  const res = await fetch(`${BASE}/cases`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(180_000) });
  return { status: res.status, c: await res.json() };
};

const health = await get("/api/health");
const store = await get("/api/demo-store");
const provenance = {
  aiMode: health.aiMode,
  models: health.models ?? (health.model ? { understanding: health.model, decision: health.model } : null),
  remoteModel: health.remoteModel ?? health.aiMode === "vllm",
  payments: health.paymentGateway,
  data: health.data ?? store.store?.data ?? null,
  deployment: health.deployment,
};

const journey = (c) => {
  const ai = c.audit.filter((e) => e.type === "UNDERSTANDING_CALL" || e.type === "MODEL_CALL");
  const states = c.audit.filter((e) => e.type === "STATE_TRANSITION").map((e) => e.to);
  return {
    investigation: {
      understoodIntent: c.understanding?.intent ?? null,
      statedAmounts: c.understanding?.mentionedAmounts ?? [],
      contradictions: c.evidence?.contradictions ?? [],
      duplicateGroups: c.evidence?.duplicateGroups?.length ?? 0,
      sources: c.evidence?.sourceIds ?? [],
    },
    decision: { proposal: c.proposal?.action ?? null, refundTransactionId: c.proposal?.refundTransactionId ?? null, confidence: c.proposal?.confidence ?? null, riskFlags: c.proposal?.riskFlags ?? [], aiCalls: ai.map((e) => ({ type: e.type, adapter: e.data?.adapter, latencyMs: e.data?.latencyMs })) },
    control: {
      policy: c.authorization?.outcome ?? null,
      failedChecks: (c.authorization?.checks ?? []).filter((k) => !k.passed).map((k) => ({ rule: k.rule, detail: k.detail })),
      authorizedAmountMinor: c.authorization?.action?.amountMinor ?? null,
    },
    outcome: { state: c.state, action: c.action ? c.action.status : null, reachedExecuting: states.includes("EXECUTING"), reasons: c.reasons.map((r) => r.code) },
    proof: { verified: c.verification?.verified ?? null, observedRefundMinor: c.verification?.observedRefund?.amountMinor ?? null, auditEvents: c.audit.length, auditTypes: [...new Set(c.audit.map((e) => e.type))] },
  };
};

const cases = [];
for (const id of Object.keys(EXPECTED)) {
  const o = store.orders.find((x) => x.orderId === id);
  const { status, c } = await post({ customerId: o.customerId, orderId: id, message: o.supportRequest.message });
  cases.push({ orderId: id, input: o.supportRequest.message, http: status, caseId: c.id, expected: EXPECTED[id], pass: c.state === EXPECTED[id], journey: journey(c) });
}

const evidence = { capturedAt: new Date().toISOString(), target: new URL(BASE).host, provenance, cases };
for (const x of cases) {
  const j = x.journey;
  console.log(`${x.pass ? "PASS" : "FAIL"}  #${x.orderId}  ${j.outcome.state}  policy ${j.control.policy}  action ${j.outcome.action ?? "none"}  verified ${j.proof.verified}  audit ${j.proof.auditEvents}`);
}
console.log(`provenance: aiMode ${provenance.aiMode} · payments ${provenance.payments} · models ${JSON.stringify(provenance.models)}`);
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Evidence written: ${OUT}`);
}
process.exit(cases.every((x) => x.pass) ? 0 : 1);
