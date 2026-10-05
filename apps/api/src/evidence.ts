// Deterministic evidence gathering. Model output is never an input here.
import type {
  CaseRequest,
  DuplicateGroup,
  EvidenceBundle,
  PaymentTransaction,
  Reason,
  RefundPolicy,
} from "./contracts.ts";
import type { CommerceStore } from "./fixtures.ts";
import { formatMinor, findMoneyMentions } from "./money.ts";

export type GatherResult = { ok: true; evidence: EvidenceBundle } | { ok: false; reason: Reason };

export function normalizeOrderId(raw: string): string {
  return raw.trim().replace(/^#/, "");
}

// Successful charges with identical amount+currency, each within the window of
// the previous one, form a group of size >= 2.
export function findDuplicateGroups(txs: readonly PaymentTransaction[], windowMinutes: number): DuplicateGroup[] {
  const sorted = txs
    .filter((t) => t.status === "SUCCEEDED")
    .toSorted((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
  const byKey = new Map<string, PaymentTransaction[]>();
  for (const t of sorted) byKey.set(`${t.currency}:${t.amountMinor}`, [...(byKey.get(`${t.currency}:${t.amountMinor}`) ?? []), t]);

  const groups: DuplicateGroup[] = [];
  for (const list of byKey.values()) {
    let run: PaymentTransaction[] = [];
    const flush = () => {
      if (run.length >= 2) {
        groups.push({ transactionIds: run.map((t) => t.id), amountMinor: run[0]!.amountMinor, currency: run[0]!.currency });
      }
    };
    for (const t of list) {
      const prev = run.at(-1);
      if (prev && Date.parse(t.createdAt) - Date.parse(prev.createdAt) > windowMinutes * 60_000) {
        flush();
        run = [];
      }
      run.push(t);
    }
    flush();
  }
  return groups;
}

export function gatherEvidence(req: CaseRequest, store: CommerceStore, policy: RefundPolicy): GatherResult {
  const customer = store.getCustomer(req.customerId);
  if (!customer) return { ok: false, reason: { code: "CUSTOMER_NOT_FOUND", detail: req.customerId } };
  const orderId = normalizeOrderId(req.orderId);
  const order = store.getOrder(orderId);
  if (!order) return { ok: false, reason: { code: "ORDER_NOT_FOUND", detail: orderId } };
  if (order.customerId !== customer.id) {
    return { ok: false, reason: { code: "ORDER_OWNERSHIP_MISMATCH", detail: `order ${orderId} is not owned by ${customer.id}` } };
  }

  const transactions = store.transactionsForOrder(order.id);
  const refunds = store.refundsForTransactions(transactions.map((t) => t.id));
  const duplicateGroups = findDuplicateGroups(transactions, policy.duplicateWindowMinutes);
  const mentionedAmounts = findMoneyMentions(req.message);

  const contradictions: string[] = [];
  for (const t of transactions) {
    if (t.customerId !== customer.id) contradictions.push(`transaction ${t.id} belongs to another customer`);
    if (t.currency !== order.currency) contradictions.push(`transaction ${t.id} currency ${t.currency} != order ${order.currency}`);
  }
  // Amounts a customer could legitimately quote: one charge, the order total, or a duplicate group's total.
  const plausible = new Set<number>([order.totalMinor]);
  for (const t of transactions) if (t.status === "SUCCEEDED") plausible.add(t.amountMinor);
  for (const g of duplicateGroups) plausible.add(g.amountMinor * g.transactionIds.length);
  for (const m of mentionedAmounts) {
    if (m.currency !== order.currency) {
      contradictions.push(`customer mentions ${m.text} but order currency is ${order.currency}`);
    } else if (!plausible.has(m.amountMinor)) {
      contradictions.push(
        `customer mentions ${formatMinor(m.amountMinor, m.currency)}, which matches no verified charge or order total`,
      );
    }
  }

  const sourceIds = [
    order.id,
    ...transactions.map((t) => t.id),
    ...refunds.map((r) => r.id),
    policy.id,
    ...policy.sections.map((s) => s.id),
  ];

  return {
    ok: true,
    evidence: { customer, order, transactions, refunds, policy, duplicateGroups, mentionedAmounts, contradictions, sourceIds },
  };
}
