// Policy registry + the deterministic gate between a model proposal and any action.
// Nothing the model says is trusted here: every claim is re-derived from evidence.
import type { Decision, Evidence, Policy, RefundPlan, Violation } from "./contracts.ts";
import { formatMinor } from "./money.ts";

const DUPLICATE_CHARGE_POLICY: Policy = {
  id: "POL-DUP-001",
  version: "2026-10-01",
  issueType: "duplicate_charge",
  text: [
    "A duplicate charge is two or more captured transactions on the same order, with identical amount and currency, created within the duplicate window.",
    "If a duplicate exists, refund exactly one of the duplicate transactions in full and keep the other. Never refund the only remaining payment for an order.",
    "After the refund the customer must have paid exactly the order total; if one refund cannot achieve that (e.g. three identical charges), escalate.",
    "Do not refund if the duplicate was already refunded, if amounts differ, if the customer's account of the charge contradicts the records, or if you are not confident.",
    "When in doubt, escalate to a human agent.",
  ].join("\n"),
  params: {
    duplicateWindowMinutes: 10,
    refundWindowDays: 60,
    maxAutoRefundMinor: { USD: 50_000, EUR: 50_000, GBP: 40_000 },
    minConfidence: 0.8,
  },
};

const POLICIES: Record<string, Policy> = { duplicate_charge: DUPLICATE_CHARGE_POLICY };

export function getPolicy(issueType: string): Policy | null {
  return POLICIES[issueType] ?? null;
}

export type Permission = "refund:duplicate";
export interface Actor {
  id: string;
  permissions: ReadonlySet<Permission>;
}

// Keyed by transaction (not case) so concurrent/resubmitted cases cannot double-refund.
export function refundIdempotencyKey(transactionId: string): string {
  return `jarvis-dup-refund:${transactionId}`;
}

export type ValidationOutcome =
  | { kind: "approve_refund"; plan: RefundPlan }
  | { kind: "close_no_action" }
  | { kind: "escalate"; violations: Violation[] };

const v = (code: Violation["code"], detail: string): Violation => ({ code, detail });

export function validateDecision(decision: Decision, ev: Evidence, actor: Actor, now: Date): ValidationOutcome {
  if (decision.action === "escalate") {
    return { kind: "escalate", violations: [v("model_escalated", decision.rationale)] };
  }

  if (decision.action === "no_action") {
    if (ev.duplicateGroups.length > 0) {
      return {
        kind: "escalate",
        violations: [v("no_action_contradicts_evidence", "model chose no_action but records show a duplicate group")],
      };
    }
    return { kind: "close_no_action" };
  }

  // action === "refund_duplicate"
  const { params } = ev.policy;
  const violations: Violation[] = [];

  if (!actor.permissions.has("refund:duplicate")) {
    violations.push(v("permission_denied", `actor ${actor.id} lacks refund:duplicate`));
  }

  const refundId = decision.refundTransactionId;
  const keepId = decision.keepTransactionId;
  if (!refundId || !keepId || refundId === keepId) {
    violations.push(v("decision_incomplete", "refund and keep transaction ids must both be set and distinct"));
    return { kind: "escalate", violations };
  }

  const refundTx = ev.transactions.find((t) => t.id === refundId);
  const keepTx = ev.transactions.find((t) => t.id === keepId);
  if (!refundTx || !keepTx) {
    const missing = [refundId, keepId].filter((id) => !ev.transactions.some((t) => t.id === id));
    violations.push(v("unknown_transaction_id", `not in evidence: ${missing.join(", ")}`));
    return { kind: "escalate", violations };
  }

  const inSameGroup = ev.duplicateGroups.some(
    (g) => g.transactionIds.includes(refundId) && g.transactionIds.includes(keepId),
  );
  if (!inSameGroup) {
    violations.push(v("not_a_duplicate", `${refundId} and ${keepId} are not in the same duplicate group`));
  }

  const priorRefunds = ev.refunds.filter((r) => r.transactionId === refundId && r.status === "succeeded");
  if (refundTx.status !== "captured" || refundTx.refundedMinor > 0 || priorRefunds.length > 0) {
    violations.push(v("already_refunded", `${refundId} is not a fully captured, unrefunded charge`));
  }
  if (keepTx.status !== "captured" || keepTx.refundedMinor > 0) {
    violations.push(v("keep_transaction_invalid", `${keepId} is not a fully captured, unrefunded charge`));
  }

  // Amount is derived from the system of record, never from the model.
  const amountMinor = refundTx.amountMinor - refundTx.refundedMinor;
  const currency = refundTx.currency;
  const limit = params.maxAutoRefundMinor[currency];
  if (limit === undefined) {
    violations.push(v("currency_not_supported", currency));
  } else if (amountMinor > limit) {
    violations.push(
      v("over_auto_refund_limit", `${formatMinor(amountMinor, currency)} > ${formatMinor(limit, currency)}`),
    );
  }

  const ageMs = now.getTime() - Date.parse(refundTx.createdAt);
  if (!(ageMs >= 0 && ageMs <= params.refundWindowDays * 86_400_000)) {
    violations.push(v("outside_refund_window", `charge age ${Math.round(ageMs / 86_400_000)}d`));
  }

  if (decision.confidence < params.minConfidence) {
    violations.push(v("low_confidence", `${decision.confidence} < ${params.minConfidence}`));
  }

  // Invariant: after the refund, the customer has paid exactly the order total.
  // Below -> we'd refund a legitimate payment. Above -> the case would close while
  // the customer is still overcharged (e.g. three identical charges).
  const netCaptured = ev.transactions
    .filter((t) => t.status === "captured" && t.currency === ev.order.currency)
    .reduce((sum, t) => sum + (t.amountMinor - t.refundedMinor), 0);
  const netAfter = netCaptured - amountMinor;
  const net = formatMinor(netAfter, ev.order.currency);
  const total = formatMinor(ev.order.totalMinor, ev.order.currency);
  if (currency !== ev.order.currency || netAfter < ev.order.totalMinor) {
    violations.push(v("would_underpay_order", `net after refund ${net} < order total ${total}`));
  } else if (netAfter > ev.order.totalMinor) {
    violations.push(v("would_leave_overcharge", `net after refund ${net} > order total ${total}`));
  }

  if (violations.length > 0) return { kind: "escalate", violations };
  return {
    kind: "approve_refund",
    plan: { transactionId: refundId, amountMinor, currency, idempotencyKey: refundIdempotencyKey(refundId) },
  };
}
