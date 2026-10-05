// Payments integration seam. The real provider (e.g. Evolus, once its API is
// documented) implements PaymentsGateway; the pipeline never touches the store directly.
import { randomUUID } from "node:crypto";
import type { Refund, RefundPlan } from "./contracts.ts";
import type { CommerceStore } from "./store.ts";

export interface PaymentsGateway {
  // Must be idempotent on plan.idempotencyKey.
  createRefund(plan: RefundPlan): Promise<Refund>;
  findRefundByIdempotencyKey(key: string): Promise<Refund | null>;
}

export type GatewayFault = "fail_before_commit" | "fail_after_commit";

export class MockGateway implements PaymentsGateway {
  #store: CommerceStore;
  #clock: () => Date;
  // Test hook: the next createRefund call fails in the given way, then resets.
  nextFault: GatewayFault | null = null;

  constructor(store: CommerceStore, clock: () => Date) {
    this.#store = store;
    this.#clock = clock;
  }

  async createRefund(plan: RefundPlan): Promise<Refund> {
    const fault = this.nextFault;
    this.nextFault = null;
    if (fault === "fail_before_commit") throw new Error("gateway: connection reset");

    const existing = this.#store.findRefundByIdempotencyKey(plan.idempotencyKey);
    if (existing) return existing;

    const tx = this.#store.getTransaction(plan.transactionId);
    if (!tx) throw new Error(`gateway: no such transaction ${plan.transactionId}`);
    if (tx.status !== "captured") throw new Error(`gateway: transaction ${tx.id} not captured`);
    if (tx.currency !== plan.currency) throw new Error("gateway: currency mismatch");
    if (!Number.isSafeInteger(plan.amountMinor) || plan.amountMinor <= 0) throw new Error("gateway: invalid amount");
    if (plan.amountMinor > tx.amountMinor - tx.refundedMinor) throw new Error("gateway: amount exceeds refundable");

    const refund: Refund = {
      id: `re_${randomUUID().slice(0, 12)}`,
      transactionId: tx.id,
      amountMinor: plan.amountMinor,
      currency: plan.currency,
      status: "succeeded",
      idempotencyKey: plan.idempotencyKey,
      createdAt: this.#clock().toISOString(),
    };
    this.#store.recordRefund(refund);

    if (fault === "fail_after_commit") throw new Error("gateway: timeout awaiting response");
    return refund;
  }

  async findRefundByIdempotencyKey(key: string): Promise<Refund | null> {
    return this.#store.findRefundByIdempotencyKey(key) ?? null;
  }
}
