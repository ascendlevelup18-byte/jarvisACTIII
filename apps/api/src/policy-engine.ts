// Deterministic authorization. The model's proposal is treated as a claim to be
// checked against records; the refund amount is derived here, never taken from it.
import type {
  AuthorizationDecision,
  CaseRequest,
  DecisionProposal,
  EvidenceBundle,
  PolicyCheck,
} from "./contracts.ts";
import { formatMinor } from "./money.ts";

export interface Permissions {
  autoRefund: boolean;
}

export function refundIdempotencyKey(transactionId: string): string {
  return `jarvis-refund:${transactionId}`;
}

export function authorize(
  proposal: DecisionProposal,
  ev: EvidenceBundle,
  req: CaseRequest,
  permissions: Permissions,
): AuthorizationDecision {
  const checks: PolicyCheck[] = [];
  const check = (rule: string, passed: boolean, detail: string) => checks.push({ rule, passed, detail });
  const deny = (): AuthorizationDecision => ({ outcome: "DENY", checks, action: null });
  const allPassed = () => checks.every((c) => c.passed);

  // Checks that apply to every outcome.
  check("ORDER_OWNERSHIP", ev.order.customerId === req.customerId, `order ${ev.order.id} owner ${ev.order.customerId}`);
  const currencies = new Set([ev.order.currency, ...ev.transactions.map((t) => t.currency), ...ev.mentionedAmounts.map((m) => m.currency)]);
  check("CURRENCY_CONSISTENT", currencies.size === 1, [...currencies].join(", "));
  check(
    "NO_CONTRADICTIONS",
    ev.contradictions.length === 0,
    ev.contradictions.length ? ev.contradictions.join("; ") : "none",
  );
  const unknownRefs = proposal.evidenceRefs.filter((r) => !ev.sourceIds.includes(r));
  check("EVIDENCE_REFS_VALID", unknownRefs.length === 0, unknownRefs.length ? `unknown: ${unknownRefs.join(", ")}` : "ok");

  if (proposal.action === "ESCALATE") {
    check("MODEL_PROPOSAL", false, `model requested escalation: ${proposal.rationale}`);
    return deny();
  }

  if (proposal.action === "NO_ACTION") {
    check("NO_DUPLICATE_IN_RECORDS", ev.duplicateGroups.length === 0, `${ev.duplicateGroups.length} duplicate group(s)`);
    return allPassed() ? { outcome: "NO_ACTION", checks, action: null } : deny();
  }

  // REFUND_DUPLICATE
  check("NO_MODEL_RISK_FLAGS", proposal.riskFlags.length === 0, proposal.riskFlags.join("; ") || "none");
  check(
    "MODEL_CONFIDENCE",
    proposal.confidence >= ev.policy.minModelConfidence,
    `${proposal.confidence} vs minimum ${ev.policy.minModelConfidence}`,
  );
  check("REFUND_PERMITTED", permissions.autoRefund, permissions.autoRefund ? "autonomous refunds enabled" : "disabled");

  const refundId = proposal.refundTransactionId;
  const keepId = proposal.keepTransactionId;
  const refundTx = ev.transactions.find((t) => t.id === refundId);
  const keepTx = ev.transactions.find((t) => t.id === keepId);
  if (!refundTx || !keepTx || refundId === keepId) {
    check("TRANSACTIONS_IN_EVIDENCE", false, `refund=${refundId} keep=${keepId} must be distinct ids from the records`);
    return deny();
  }
  check("TRANSACTIONS_IN_EVIDENCE", true, `refund=${refundTx.id} keep=${keepTx.id}`);

  check(
    "DUPLICATE_VERIFIED",
    ev.duplicateGroups.some((g) => g.transactionIds.includes(refundTx.id) && g.transactionIds.includes(keepTx.id)),
    "both charges in the same duplicate group",
  );
  const priorRefunds = ev.refunds.filter((r) => r.transactionId === refundTx.id && r.status === "SUCCEEDED");
  check(
    "NOT_ALREADY_REFUNDED",
    refundTx.status === "SUCCEEDED" && refundTx.refundedMinor === 0 && priorRefunds.length === 0,
    `${refundTx.id} refunded ${formatMinor(refundTx.refundedMinor, refundTx.currency)}`,
  );
  check(
    "KEPT_CHARGE_INTACT",
    keepTx.status === "SUCCEEDED" && keepTx.refundedMinor === 0,
    `${keepTx.id} refunded ${formatMinor(keepTx.refundedMinor, keepTx.currency)}`,
  );

  // Amount comes from the verified transaction record.
  const amountMinor = refundTx.amountMinor - refundTx.refundedMinor;
  const netPaid = ev.transactions
    .filter((t) => t.status === "SUCCEEDED" && t.currency === ev.order.currency)
    .reduce((sum, t) => sum + t.amountMinor - t.refundedMinor, 0);
  const netAfter = netPaid - amountMinor;
  check(
    "ORDER_PAID_EXACTLY_ONCE",
    refundTx.currency === ev.order.currency && netAfter === ev.order.totalMinor,
    `paid after refund ${formatMinor(netAfter, ev.order.currency)}, order total ${formatMinor(ev.order.totalMinor, ev.order.currency)}`,
  );
  const limit = ev.policy.autoRefundLimitMinor[refundTx.currency];
  check(
    "WITHIN_AUTHORITY",
    amountMinor > 0 && amountMinor <= limit,
    `${formatMinor(amountMinor, refundTx.currency)} vs limit ${formatMinor(limit, refundTx.currency)}`,
  );

  if (!allPassed()) return deny();
  return {
    outcome: "APPROVE",
    checks,
    action: {
      transactionId: refundTx.id,
      amountMinor,
      currency: refundTx.currency,
      idempotencyKey: refundIdempotencyKey(refundTx.id),
    },
  };
}
