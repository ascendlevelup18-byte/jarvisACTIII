// Deterministic evidence retrieval and fact derivation. The model reasons over
// these facts; the validator re-checks them. No model output is trusted here
// beyond being used as a lookup key.
import type { DuplicateGroup, Evidence, Extraction, Transaction, Violation } from "./contracts.ts";
import { normalizeCurrency, parseAmountToMinor, symbolOf } from "./money.ts";
import { getPolicy } from "./policy.ts";
import type { CommerceStore } from "./store.ts";

export type EvidenceResult = { ok: true; evidence: Evidence } | { ok: false; violations: Violation[] };

// Captured charges with identical amount+currency, each within `windowMinutes`
// of the previous one, form a duplicate group (size >= 2).
export function findDuplicateGroups(txs: readonly Transaction[], windowMinutes: number): DuplicateGroup[] {
  const windowMs = windowMinutes * 60_000;
  const captured = txs
    .filter((t) => t.status === "captured")
    .toSorted((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));

  const byKey = new Map<string, Transaction[]>();
  for (const t of captured) {
    const key = `${t.currency}:${t.amountMinor}`;
    byKey.set(key, [...(byKey.get(key) ?? []), t]);
  }

  const groups: DuplicateGroup[] = [];
  for (const list of byKey.values()) {
    let cluster: Transaction[] = [];
    const flush = () => {
      if (cluster.length >= 2) {
        groups.push({
          amountMinor: cluster[0]!.amountMinor,
          currency: cluster[0]!.currency,
          transactionIds: cluster.map((t) => t.id),
        });
      }
    };
    for (const t of list) {
      const prev = cluster.at(-1);
      if (prev && Date.parse(t.createdAt) - Date.parse(prev.createdAt) > windowMs) {
        flush();
        cluster = [];
      }
      cluster.push(t);
    }
    flush();
  }
  return groups;
}

export function normalizeOrderId(raw: string): string {
  return raw.trim().replace(/^#/, "").toUpperCase();
}

export function assembleEvidence(customerId: string, extraction: Extraction, store: CommerceStore): EvidenceResult {
  const fail = (code: Violation["code"], detail: string): EvidenceResult => ({
    ok: false,
    violations: [{ code, detail }],
  });

  if (extraction.issueType !== "duplicate_charge") return fail("unsupported_issue", extraction.issueType);
  const policy = getPolicy(extraction.issueType);
  if (!policy) return fail("no_policy", extraction.issueType);

  if (!extraction.orderId || !extraction.orderId.trim()) return fail("missing_order_id", "no order id in message");
  const orderId = normalizeOrderId(extraction.orderId);
  const order = store.getOrder(orderId);
  if (!order) return fail("order_not_found", orderId);
  if (order.customerId !== customerId) return fail("order_customer_mismatch", `${orderId} not owned by ${customerId}`);

  const transactions = store.listTransactionsForOrder(order.id);
  const refunds = store.listRefundsForTransactions(transactions.map((t) => t.id));
  const duplicateGroups = findDuplicateGroups(transactions, policy.params.duplicateWindowMinutes);

  const contradictions: string[] = [];
  for (const t of transactions) {
    if (t.customerId !== customerId) contradictions.push(`transaction ${t.id} belongs to another customer`);
  }

  const claimedCurrency =
    (extraction.claimedCurrency && normalizeCurrency(extraction.claimedCurrency)) ||
    (extraction.claimedAmount && symbolOf(extraction.claimedAmount)) ||
    null;
  if (claimedCurrency && claimedCurrency !== order.currency) {
    contradictions.push(`claimed currency ${claimedCurrency} != order currency ${order.currency}`);
  }

  const claimedAmountMinor = extraction.claimedAmount
    ? parseAmountToMinor(extraction.claimedAmount, order.currency)
    : null;
  if (claimedAmountMinor !== null) {
    // Customers may quote one charge or the total they were billed.
    const plausible = new Set<number>(transactions.filter((t) => t.status === "captured").map((t) => t.amountMinor));
    for (const g of duplicateGroups) plausible.add(g.amountMinor * g.transactionIds.length);
    if (!plausible.has(claimedAmountMinor)) {
      contradictions.push(`claimed amount ${claimedAmountMinor} matches no captured charge`);
    }
  }

  return {
    ok: true,
    evidence: {
      customerId,
      order,
      transactions,
      refunds,
      duplicateGroups,
      claimedAmountMinor,
      contradictions,
      policy,
    },
  };
}
