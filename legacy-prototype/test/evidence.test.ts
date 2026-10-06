import assert from "node:assert/strict";
import { test } from "node:test";
import type { Extraction, Transaction } from "../src/contracts.ts";
import { assembleEvidence, findDuplicateGroups } from "../src/evidence.ts";
import { CommerceStore, seedDemoData } from "../src/store.ts";
import { NOW } from "./helpers.ts";

const t0 = Date.parse("2026-10-01T00:00:00Z");
const tx = (id: string, minutes: number, over: Partial<Transaction> = {}): Transaction => ({
  id,
  orderId: "O",
  customerId: "cus_x",
  amountMinor: 1000,
  currency: "USD",
  status: "captured",
  refundedMinor: 0,
  createdAt: new Date(t0 + minutes * 60_000).toISOString(),
  ...over,
});

test("findDuplicateGroups: window boundaries and chaining", () => {
  const groups = findDuplicateGroups([tx("a", 0), tx("b", 5), tx("c", 14), tx("d", 30)], 10);
  assert.deepEqual(groups, [{ amountMinor: 1000, currency: "USD", transactionIds: ["a", "b", "c"] }]);
});

test("findDuplicateGroups: amount, currency and status must match", () => {
  assert.deepEqual(findDuplicateGroups([tx("a", 0), tx("b", 1, { amountMinor: 1001 })], 10), []);
  assert.deepEqual(findDuplicateGroups([tx("a", 0), tx("b", 1, { currency: "EUR" })], 10), []);
  assert.deepEqual(findDuplicateGroups([tx("a", 0), tx("b", 1, { status: "failed" })], 10), []);
});

test("findDuplicateGroups: order-independent", () => {
  const groups = findDuplicateGroups([tx("b", 2), tx("a", 0)], 10);
  assert.deepEqual(groups[0]?.transactionIds, ["a", "b"]);
});

function run(customerId: string, over: Partial<Extraction>) {
  const store = new CommerceStore();
  seedDemoData(store, NOW);
  return assembleEvidence(
    customerId,
    { issueType: "duplicate_charge", orderId: "ORD-1001", claimedAmount: null, claimedCurrency: null, ...over },
    store,
  );
}

const codeOf = (r: ReturnType<typeof run>) => (r.ok ? null : r.violations[0]?.code);

test("assembleEvidence: hard failures before the model decides", () => {
  assert.equal(codeOf(run("cus_alice", { issueType: "other" })), "unsupported_issue");
  assert.equal(codeOf(run("cus_alice", { orderId: null })), "missing_order_id");
  assert.equal(codeOf(run("cus_alice", { orderId: "  " })), "missing_order_id");
  assert.equal(codeOf(run("cus_alice", { orderId: "ORD-9999" })), "order_not_found");
  assert.equal(codeOf(run("cus_bob", {})), "order_customer_mismatch");
});

test("assembleEvidence: normalizes order id and finds the duplicate", () => {
  const r = run("cus_alice", { orderId: " #ord-1001 " });
  assert.ok(r.ok);
  assert.equal(r.evidence.order.id, "ORD-1001");
  assert.deepEqual(r.evidence.duplicateGroups[0]?.transactionIds, ["tx_1001a", "tx_1001b"]);
  assert.deepEqual(r.evidence.contradictions, []);
});

test("assembleEvidence: claimed amount checks", () => {
  const single = run("cus_alice", { claimedAmount: "$49.99" });
  assert.ok(single.ok && single.evidence.contradictions.length === 0);
  const total = run("cus_alice", { claimedAmount: "99.98" });
  assert.ok(total.ok && total.evidence.contradictions.length === 0);
  const wrong = run("cus_alice", { claimedAmount: "$10.00" });
  assert.ok(wrong.ok && wrong.evidence.contradictions.length === 1);
  const unparseable = run("cus_alice", { claimedAmount: "fifty bucks" });
  assert.ok(unparseable.ok && unparseable.evidence.claimedAmountMinor === null);
});

test("assembleEvidence: currency contradiction", () => {
  const sym = run("cus_alice", { claimedAmount: "€49.99" });
  assert.ok(sym.ok && sym.evidence.contradictions.some((c) => c.includes("currency")));
  const code = run("cus_alice", { claimedCurrency: "GBP" });
  assert.ok(code.ok && code.evidence.contradictions.some((c) => c.includes("currency")));
});
