// In-memory system of record. Reads return clones so evidence snapshots and
// case records can never be mutated by later writes.
import type { CaseRecord, Order, Refund, Transaction } from "./contracts.ts";

export class CommerceStore {
  #orders = new Map<string, Order>();
  #transactions = new Map<string, Transaction>();
  #refunds = new Map<string, Refund>();

  addOrder(o: Order): void {
    this.#orders.set(o.id, structuredClone(o));
  }
  addTransaction(t: Transaction): void {
    this.#transactions.set(t.id, structuredClone(t));
  }
  getOrder(id: string): Order | undefined {
    const o = this.#orders.get(id);
    return o && structuredClone(o);
  }
  getTransaction(id: string): Transaction | undefined {
    const t = this.#transactions.get(id);
    return t && structuredClone(t);
  }
  listTransactionsForOrder(orderId: string): Transaction[] {
    return [...this.#transactions.values()]
      .filter((t) => t.orderId === orderId)
      .map((t) => structuredClone(t));
  }
  listRefundsForTransactions(txIds: readonly string[]): Refund[] {
    const ids = new Set(txIds);
    return [...this.#refunds.values()].filter((r) => ids.has(r.transactionId)).map((r) => structuredClone(r));
  }
  findRefundByIdempotencyKey(key: string): Refund | undefined {
    const r = [...this.#refunds.values()].find((x) => x.idempotencyKey === key);
    return r && structuredClone(r);
  }
  // Only the gateway calls this; it applies a refund atomically (single-threaded JS).
  recordRefund(r: Refund): void {
    const tx = this.#transactions.get(r.transactionId);
    if (!tx) throw new Error(`recordRefund: unknown transaction ${r.transactionId}`);
    this.#refunds.set(r.id, structuredClone(r));
    if (r.status === "succeeded") tx.refundedMinor += r.amountMinor;
  }
}

export class CaseStore {
  #cases = new Map<string, CaseRecord>();

  save(c: CaseRecord): void {
    this.#cases.set(c.id, structuredClone(c));
  }
  get(id: string): CaseRecord | undefined {
    const c = this.#cases.get(id);
    return c && structuredClone(c);
  }
  list(): CaseRecord[] {
    return [...this.#cases.values()].map((c) => structuredClone(c));
  }
}

// Demo scenarios. Timestamps are relative to `now` so policy windows stay valid.
export function seedDemoData(store: CommerceStore, now: Date): void {
  const at = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();
  const DAY = 86_400_000;
  const order = (id: string, customerId: string, totalMinor: number, currency: Order["currency"], ago: number) =>
    store.addOrder({ id, customerId, totalMinor, currency, createdAt: at(ago) });
  const tx = (
    id: string,
    orderId: string,
    customerId: string,
    amountMinor: number,
    currency: Transaction["currency"],
    ago: number,
  ) =>
    store.addTransaction({
      id,
      orderId,
      customerId,
      amountMinor,
      currency,
      status: "captured",
      refundedMinor: 0,
      createdAt: at(ago),
    });

  // 1. Clean duplicate: two identical captures 90s apart -> auto refund.
  order("ORD-1001", "cus_alice", 4999, "USD", 2 * DAY);
  tx("tx_1001a", "ORD-1001", "cus_alice", 4999, "USD", 2 * DAY);
  tx("tx_1001b", "ORD-1001", "cus_alice", 4999, "USD", 2 * DAY - 90_000);

  // 2. Single charge -> no action.
  order("ORD-1002", "cus_alice", 2500, "USD", 5 * DAY);
  tx("tx_1002a", "ORD-1002", "cus_alice", 2500, "USD", 5 * DAY);

  // 3. Duplicate above auto-refund limit -> escalate.
  order("ORD-2001", "cus_bob", 89900, "USD", DAY);
  tx("tx_2001a", "ORD-2001", "cus_bob", 89900, "USD", DAY);
  tx("tx_2001b", "ORD-2001", "cus_bob", 89900, "USD", DAY - 60_000);

  // 4. Duplicate already refunded -> escalate.
  order("ORD-2002", "cus_bob", 1500, "EUR", 3 * DAY);
  tx("tx_2002a", "ORD-2002", "cus_bob", 1500, "EUR", 3 * DAY);
  tx("tx_2002b", "ORD-2002", "cus_bob", 1500, "EUR", 3 * DAY - 30_000);
  store.recordRefund({
    id: "re_seed_2002b",
    transactionId: "tx_2002b",
    amountMinor: 1500,
    currency: "EUR",
    status: "succeeded",
    idempotencyKey: "manual-agent-refund-2002b",
    createdAt: at(2 * DAY),
  });

  // 5. Legit split payment that *looks* like a duplicate -> must not refund.
  order("ORD-3001", "cus_carol", 6000, "USD", DAY);
  tx("tx_3001a", "ORD-3001", "cus_carol", 3000, "USD", DAY);
  tx("tx_3001b", "ORD-3001", "cus_carol", 3000, "USD", DAY - 45_000);
}
