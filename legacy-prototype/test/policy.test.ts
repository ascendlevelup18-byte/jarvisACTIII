import assert from "node:assert/strict";
import { test } from "node:test";
import { DecisionSchema, type Decision, type Evidence } from "../src/contracts.ts";
import { validateDecision, type Actor } from "../src/policy.ts";
import { NOW, decision, evidenceFor } from "./helpers.ts";

const agent: Actor = { id: "a", permissions: new Set(["refund:duplicate"]) };
const d = (over: Record<string, unknown> = {}): Decision => DecisionSchema.parse(JSON.parse(decision(over)));

function codes(dec: Decision, ev: Evidence, actor = agent, now = NOW): string[] {
  const out = validateDecision(dec, ev, actor, now);
  return out.kind === "escalate" ? out.violations.map((v) => v.code) : [out.kind];
}

test("approves a clean duplicate with an amount derived from records", () => {
  const out = validateDecision(d(), evidenceFor("ORD-1001", "cus_alice"), agent, NOW);
  assert.deepEqual(out, {
    kind: "approve_refund",
    plan: {
      transactionId: "tx_1001b",
      amountMinor: 4999,
      currency: "USD",
      idempotencyKey: "jarvis-dup-refund:tx_1001b",
    },
  });
});

test("permission (kill switch)", () => {
  const none: Actor = { id: "a", permissions: new Set() };
  assert.deepEqual(codes(d(), evidenceFor("ORD-1001", "cus_alice"), none), ["permission_denied"]);
});

test("incomplete decision", () => {
  const ev = evidenceFor("ORD-1001", "cus_alice");
  assert.deepEqual(codes(d({ keepTransactionId: null }), ev), ["decision_incomplete"]);
  assert.deepEqual(codes(d({ keepTransactionId: "tx_1001b" }), ev), ["decision_incomplete"]);
});

test("hallucinated transaction id", () => {
  assert.deepEqual(codes(d({ refundTransactionId: "tx_9999" }), evidenceFor("ORD-1001", "cus_alice")), [
    "unknown_transaction_id",
  ]);
});

test("transactions outside a duplicate group", () => {
  const ev = { ...evidenceFor("ORD-1001", "cus_alice"), duplicateGroups: [] };
  assert.ok(codes(d(), ev).includes("not_a_duplicate"));
});

test("already refunded / invalid keep transaction", () => {
  const ev = evidenceFor("ORD-2002", "cus_bob");
  assert.ok(codes(d({ refundTransactionId: "tx_2002b", keepTransactionId: "tx_2002a" }), ev).includes("already_refunded"));
  assert.ok(
    codes(d({ refundTransactionId: "tx_2002a", keepTransactionId: "tx_2002b" }), ev).includes("keep_transaction_invalid"),
  );
});

test("auto-refund limit", () => {
  const ev = evidenceFor("ORD-2001", "cus_bob");
  assert.deepEqual(codes(d({ refundTransactionId: "tx_2001b", keepTransactionId: "tx_2001a" }), ev), [
    "over_auto_refund_limit",
  ]);
});

test("refund window", () => {
  const later = new Date(NOW.getTime() + 90 * 86_400_000);
  assert.deepEqual(codes(d(), evidenceFor("ORD-1001", "cus_alice"), agent, later), ["outside_refund_window"]);
});

test("confidence floor", () => {
  assert.deepEqual(codes(d({ confidence: 0.5 }), evidenceFor("ORD-1001", "cus_alice")), ["low_confidence"]);
});

test("split payment that looks like a duplicate is never refunded", () => {
  const ev = evidenceFor("ORD-3001", "cus_carol");
  assert.deepEqual(codes(d({ refundTransactionId: "tx_3001b", keepTransactionId: "tx_3001a" }), ev), [
    "would_underpay_order",
  ]);
});

test("no_action and escalate", () => {
  const nullIds = { refundTransactionId: null, keepTransactionId: null };
  assert.deepEqual(codes(d({ action: "no_action", ...nullIds }), evidenceFor("ORD-1002", "cus_alice")), [
    "close_no_action",
  ]);
  assert.deepEqual(codes(d({ action: "no_action", ...nullIds }), evidenceFor("ORD-1001", "cus_alice")), [
    "no_action_contradicts_evidence",
  ]);
  assert.deepEqual(codes(d({ action: "escalate", ...nullIds }), evidenceFor("ORD-1001", "cus_alice")), [
    "model_escalated",
  ]);
});
