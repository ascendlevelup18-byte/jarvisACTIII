// Single source of truth for every shape that crosses a trust boundary.
// Anything produced by the LLM or by HTTP callers is parsed with these schemas.
import { z } from "zod";

export const CURRENCIES = ["USD", "EUR", "GBP"] as const;
export const CurrencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof CurrencySchema>;

// ---------- Ingest (HTTP) ----------

export const CaseInputSchema = z
  .object({
    // Identity comes from the authenticated channel, never from the model.
    customerId: z.string().regex(/^cus_[A-Za-z0-9]{1,32}$/),
    message: z.string().trim().min(1).max(4000),
  })
  .strict();
export type CaseInput = z.infer<typeof CaseInputSchema>;

// ---------- LLM output: extraction ----------

export const ExtractionSchema = z
  .object({
    issueType: z.enum(["duplicate_charge", "other"]),
    orderId: z.string().max(64).nullable(),
    // Verbatim amount text; parsed to minor units by deterministic code.
    claimedAmount: z.string().max(32).nullable(),
    claimedCurrency: z.string().max(8).nullable(),
  })
  .strict();
export type Extraction = z.infer<typeof ExtractionSchema>;

// ---------- LLM output: decision ----------

export const DecisionSchema = z
  .object({
    action: z.enum(["refund_duplicate", "no_action", "escalate"]),
    refundTransactionId: z.string().max(64).nullable(),
    keepTransactionId: z.string().max(64).nullable(),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(1).max(2000),
    citedEvidence: z.array(z.string().max(64)).max(20),
  })
  .strict();
export type Decision = z.infer<typeof DecisionSchema>;

// ---------- Domain records (system of record, not model output) ----------

export interface Order {
  id: string;
  customerId: string;
  totalMinor: number;
  currency: Currency;
  createdAt: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  customerId: string;
  amountMinor: number;
  currency: Currency;
  status: "captured" | "pending" | "failed";
  refundedMinor: number;
  createdAt: string;
}

export interface Refund {
  id: string;
  transactionId: string;
  amountMinor: number;
  currency: Currency;
  status: "succeeded" | "failed";
  idempotencyKey: string;
  createdAt: string;
}

export interface DuplicatePolicyParams {
  duplicateWindowMinutes: number;
  refundWindowDays: number;
  maxAutoRefundMinor: Record<Currency, number>;
  minConfidence: number;
}

export interface Policy {
  id: string;
  version: string;
  issueType: "duplicate_charge";
  text: string;
  params: DuplicatePolicyParams;
}

export interface DuplicateGroup {
  amountMinor: number;
  currency: Currency;
  transactionIds: string[]; // ordered by createdAt
}

export interface Evidence {
  customerId: string;
  order: Order;
  transactions: Transaction[];
  refunds: Refund[];
  duplicateGroups: DuplicateGroup[];
  claimedAmountMinor: number | null;
  contradictions: string[];
  policy: Policy;
}

// ---------- Case lifecycle ----------

export type CaseState =
  | "received"
  | "extracted"
  | "evidence_gathered"
  | "decided"
  | "approved"
  | "executing" // refund call about to be / being made; outcome unknown
  | "verifying" // call returned or threw; reading back the system of record
  | "resolved" // only reachable from verifying with verification.ok === true
  | "closed_no_action"
  | "escalated";

export const TERMINAL_STATES: ReadonlySet<CaseState> = new Set(["resolved", "closed_no_action", "escalated"]);

export type ReasonCode =
  // evidence
  | "unsupported_issue"
  | "missing_order_id"
  | "order_not_found"
  | "order_customer_mismatch"
  | "no_policy"
  | "contradictory_evidence"
  // model
  | "llm_unavailable"
  | "llm_invalid_output"
  | "model_escalated"
  // validator
  | "permission_denied"
  | "decision_incomplete"
  | "unknown_transaction_id"
  | "not_a_duplicate"
  | "already_refunded"
  | "keep_transaction_invalid"
  | "currency_not_supported"
  | "over_auto_refund_limit"
  | "outside_refund_window"
  | "low_confidence"
  | "would_underpay_order"
  | "would_leave_overcharge"
  | "no_action_contradicts_evidence"
  // execution
  | "stale_evidence"
  | "execution_unverified"
  | "internal_error";

export interface Violation {
  code: ReasonCode;
  detail: string;
}

export interface RefundPlan {
  transactionId: string;
  amountMinor: number;
  currency: Currency;
  idempotencyKey: string;
}

export interface CaseRecord {
  id: string;
  customerId: string;
  message: string;
  state: CaseState;
  createdAt: string;
  updatedAt: string;
  extraction: Extraction | null;
  evidence: Evidence | null;
  decision: Decision | null;
  plan: RefundPlan | null;
  execution: { refundId: string | null; error: string | null } | null;
  verification: { ok: boolean; refundId: string | null; detail: string } | null;
  escalation: { reasons: Violation[] } | null;
}
