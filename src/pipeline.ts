// Linear, bounded case pipeline. Each case makes at most two model calls and one
// refund call; every exit path lands in a terminal state with an audit trail.
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import {
  DecisionSchema,
  ExtractionSchema,
  TERMINAL_STATES,
  type CaseInput,
  type CaseRecord,
  type CaseState,
  type Violation,
} from "./contracts.ts";
import type { AuditLog } from "./audit.ts";
import { assembleEvidence } from "./evidence.ts";
import type { PaymentsGateway } from "./gateway.ts";
import { parseStructured, type LlmClient, type LlmRequest } from "./llm.ts";
import { validateDecision, type Actor } from "./policy.ts";
import { decisionRequest, extractionRequest } from "./prompts.ts";
import type { CaseStore, CommerceStore } from "./store.ts";

export interface Deps {
  commerce: CommerceStore;
  cases: CaseStore;
  gateway: PaymentsGateway;
  llm: LlmClient;
  audit: AuditLog;
  actor: Actor;
  clock: () => Date;
}

const TRANSITIONS: Record<CaseState, readonly CaseState[]> = {
  received: ["extracted", "escalated"],
  extracted: ["evidence_gathered", "escalated"],
  evidence_gathered: ["decided", "escalated"],
  decided: ["approved", "closed_no_action", "escalated"],
  approved: ["executed", "escalated"],
  executed: ["resolved", "escalated"],
  resolved: [],
  closed_no_action: [],
  escalated: [],
};

const MAX_AUDITED_RAW = 8000;

export async function processCase(input: CaseInput, deps: Deps): Promise<CaseRecord> {
  const now = deps.clock().toISOString();
  const rec: CaseRecord = {
    id: `case_${randomUUID()}`,
    customerId: input.customerId,
    message: input.message,
    state: "received",
    createdAt: now,
    updatedAt: now,
    extraction: null,
    evidence: null,
    decision: null,
    plan: null,
    execution: null,
    verification: null,
    escalation: null,
  };
  deps.cases.save(rec);
  deps.audit.append(rec.id, "case.received", { customerId: rec.customerId, message: rec.message });

  try {
    await run(rec, deps);
  } catch (e) {
    failSafe(rec, deps, e);
  }
  return deps.cases.get(rec.id) ?? rec;
}

async function run(rec: CaseRecord, deps: Deps): Promise<void> {
  // 2. Extract (model)
  const extraction = await callModel(rec, deps, extractionRequest(rec.message), ExtractionSchema);
  if (!extraction.ok) return escalate(rec, deps, extraction.violations);
  rec.extraction = extraction.value;
  transition(rec, deps, "extracted", { extraction: rec.extraction });

  // 3-5. Retrieve records + policy, derive facts (deterministic)
  const ev = assembleEvidence(rec.customerId, rec.extraction, deps.commerce);
  if (!ev.ok) return escalate(rec, deps, ev.violations);
  rec.evidence = ev.evidence;
  transition(rec, deps, "evidence_gathered", {
    orderId: ev.evidence.order.id,
    transactionIds: ev.evidence.transactions.map((t) => t.id),
    duplicateGroups: ev.evidence.duplicateGroups,
    contradictions: ev.evidence.contradictions,
    policy: `${ev.evidence.policy.id}@${ev.evidence.policy.version}`,
  });
  if (ev.evidence.contradictions.length > 0) {
    return escalate(
      rec,
      deps,
      ev.evidence.contradictions.map((detail) => ({ code: "contradictory_evidence", detail })),
    );
  }

  // 6-7. Decide (model)
  const decision = await callModel(rec, deps, decisionRequest(rec.message, ev.evidence), DecisionSchema);
  if (!decision.ok) return escalate(rec, deps, decision.violations);
  rec.decision = decision.value;
  transition(rec, deps, "decided", { decision: rec.decision });

  // 8. Validate (deterministic gate)
  const outcome = validateDecision(rec.decision, ev.evidence, deps.actor, deps.clock());
  deps.audit.append(rec.id, "validation", outcome);
  if (outcome.kind === "escalate") return escalate(rec, deps, outcome.violations);
  if (outcome.kind === "close_no_action") return transition(rec, deps, "closed_no_action", {});
  rec.plan = outcome.plan;
  transition(rec, deps, "approved", { plan: rec.plan });

  // 9. Execute. A thrown error does not mean nothing happened; verification decides.
  let refundId: string | null = null;
  let error: string | null = null;
  try {
    refundId = (await deps.gateway.createRefund(rec.plan)).id;
  } catch (e) {
    error = errorMessage(e);
  }
  rec.execution = { refundId, error };
  transition(rec, deps, "executed", { execution: rec.execution });

  // 10. Verify against the external system of record.
  const plan = rec.plan;
  let detail: string;
  let found = null;
  try {
    found = await deps.gateway.findRefundByIdempotencyKey(plan.idempotencyKey);
    detail = !found
      ? "no refund found for idempotency key"
      : found.status !== "succeeded"
        ? `refund status ${found.status}`
        : found.transactionId !== plan.transactionId || found.amountMinor !== plan.amountMinor || found.currency !== plan.currency
          ? "refund does not match plan"
          : "ok";
  } catch (e) {
    detail = `verification lookup failed: ${errorMessage(e)}`;
  }
  const ok = detail === "ok";
  rec.verification = { ok, refundId: found?.id ?? null, detail };
  if (!ok) return escalate(rec, deps, [{ code: "execution_unverified", detail }]);
  transition(rec, deps, "resolved", { verification: rec.verification });
}

async function callModel<T>(
  rec: CaseRecord,
  deps: Deps,
  req: LlmRequest,
  schema: z.ZodType<T>,
): Promise<{ ok: true; value: T } | { ok: false; violations: Violation[] }> {
  const started = performance.now();
  let raw: string;
  try {
    raw = await deps.llm.complete(req);
  } catch (e) {
    const detail = errorMessage(e);
    deps.audit.append(rec.id, `llm.${req.task}.error`, { model: deps.llm.name, error: detail });
    return { ok: false, violations: [{ code: "llm_unavailable", detail }] };
  }
  const latencyMs = Math.round(performance.now() - started);
  const parsed = parseStructured(raw, schema);
  deps.audit.append(rec.id, `llm.${req.task}`, {
    model: deps.llm.name,
    latencyMs,
    raw: raw.slice(0, MAX_AUDITED_RAW),
    valid: parsed.ok,
    error: parsed.ok ? null : parsed.error,
  });
  if (!parsed.ok) return { ok: false, violations: [{ code: "llm_invalid_output", detail: parsed.error }] };
  return parsed;
}

function transition(rec: CaseRecord, deps: Deps, to: CaseState, data: Record<string, unknown>): void {
  const from = rec.state;
  if (!TRANSITIONS[from].includes(to)) throw new Error(`illegal transition ${from} -> ${to}`);
  rec.state = to;
  rec.updatedAt = deps.clock().toISOString();
  deps.cases.save(rec);
  deps.audit.append(rec.id, `state.${to}`, { from, ...data });
}

function escalate(rec: CaseRecord, deps: Deps, reasons: Violation[]): void {
  rec.escalation = { reasons };
  transition(rec, deps, "escalated", { reasons });
}

// Last line of defence: an unexpected exception must still leave the case escalated.
function failSafe(rec: CaseRecord, deps: Deps, e: unknown): void {
  const reasons: Violation[] = [{ code: "internal_error", detail: errorMessage(e) }];
  if (TERMINAL_STATES.has(rec.state)) {
    console.error(`[jarvis] error after terminal state on ${rec.id}:`, e);
    return;
  }
  try {
    escalate(rec, deps, reasons);
  } catch (inner) {
    // Audit/storage itself failed; force the state so the case is never stuck mid-flight.
    rec.state = "escalated";
    rec.escalation = { reasons };
    rec.updatedAt = deps.clock().toISOString();
    deps.cases.save(rec);
    console.error(`[jarvis] failSafe could not audit ${rec.id}:`, e, inner);
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
