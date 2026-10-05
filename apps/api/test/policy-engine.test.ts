import assert from "node:assert/strict";
import { test } from "node:test";
import { DecisionProposalSchema, type CaseRequest, type EvidenceBundle } from "../src/contracts.ts";
import { gatherEvidence } from "../src/evidence.ts";
import { CommerceStore, REFUND_POLICY, SCENARIOS, seedFixtures } from "../src/fixtures.ts";
import { findMoneyMentions } from "../src/money.ts";
import { authorize } from "../src/policy-engine.ts";
import { NOW, proposal } from "./helpers.ts";

function evidence(req: CaseRequest): EvidenceBundle {
  const store = new CommerceStore();
  seedFixtures(store, NOW);
  const r = gatherEvidence(req, store, REFUND_POLICY);
  if (!r.ok) throw new Error(r.reason.detail);
  return r.evidence;
}
const p = (over: Record<string, unknown> = {}) => DecisionProposalSchema.parse(JSON.parse(proposal(over)));
const failed = (req: CaseRequest, over: Record<string, unknown> = {}, autoRefund = true) =>
  authorize(p(over), evidence(req), req, { autoRefund })
    .checks.filter((c) => !c.passed)
    .map((c) => c.rule);

const valid = SCENARIOS.validDuplicate;

test("approves a verified duplicate; amount is derived from the transaction record", () => {
  const d = authorize(p(), evidence(valid), valid, { autoRefund: true });
  assert.equal(d.outcome, "APPROVE");
  assert.ok(d.checks.every((c) => c.passed));
  assert.deepEqual(d.action, {
    transactionId: "CHARGE-48291-B",
    amountMinor: 8999,
    currency: "USD",
    idempotencyKey: "jarvis-refund:CHARGE-48291-B",
  });
});

test("model cannot supply money: amount fields are rejected by the schema", () => {
  assert.equal(DecisionProposalSchema.safeParse({ ...JSON.parse(proposal()), refundAmountMinor: 500000 }).success, false);
  assert.equal(DecisionProposalSchema.safeParse({ ...JSON.parse(proposal()), verified: true }).success, false);
});

test("conflicting amount blocks", () => {
  const req = SCENARIOS.conflictingAmount;
  assert.deepEqual(
    failed(req, { refundTransactionId: "CHARGE-48292-B", keepTransactionId: "CHARGE-48292-A", evidenceRefs: [] }),
    ["NO_CONTRADICTIONS"],
  );
});

test("already-refunded charge blocks", () => {
  const req = SCENARIOS.alreadyRefunded;
  assert.deepEqual(
    failed(req, { refundTransactionId: "CHARGE-48293-B", keepTransactionId: "CHARGE-48293-A", evidenceRefs: [] }),
    ["NOT_ALREADY_REFUNDED", "WITHIN_AUTHORITY"],
  );
});

test("currency mismatch blocks", () => {
  const req = { ...valid, message: "charged twice, €89.99" };
  assert.deepEqual(failed(req), ["CURRENCY_CONSISTENT", "NO_CONTRADICTIONS"]);
});

test("hallucinated or cross-order transaction ids block", () => {
  assert.deepEqual(failed(valid, { refundTransactionId: "CHARGE-48294-B" }), ["TRANSACTIONS_IN_EVIDENCE"]);
  assert.deepEqual(failed(valid, { keepTransactionId: "CHARGE-48291-B" }), ["TRANSACTIONS_IN_EVIDENCE"]);
  assert.deepEqual(failed(valid, { evidenceRefs: ["POL-EVIL"] }), ["EVIDENCE_REFS_VALID"]);
});

test("model risk flags, low confidence and disabled permission block", () => {
  assert.deepEqual(failed(valid, { riskFlags: ["unsure"] }), ["NO_MODEL_RISK_FLAGS"]);
  assert.deepEqual(failed(valid, { confidence: 0.2 }), ["MODEL_CONFIDENCE"]);
  assert.deepEqual(failed(valid, {}, false), ["REFUND_PERMITTED"]);
});

test("ESCALATE is always a denial; NO_ACTION only when records show no duplicate", () => {
  const nulls = { refundTransactionId: null, keepTransactionId: null };
  assert.equal(authorize(p({ action: "ESCALATE", ...nulls }), evidence(valid), valid, { autoRefund: true }).outcome, "DENY");
  assert.equal(authorize(p({ action: "NO_ACTION", ...nulls }), evidence(valid), valid, { autoRefund: true }).outcome, "DENY");
});

test("deterministic money mention parsing", () => {
  assert.deepEqual(
    findMoneyMentions("order #48291: refund $5,000.00 or 250 eur, not 48291").map((m) => [m.amountMinor, m.currency]),
    [
      [500000, "USD"],
      [25000, "EUR"],
    ],
  );
  assert.deepEqual(findMoneyMentions("I was charged twice for order #48291."), []);
});
