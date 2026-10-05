import { setTimeout as sleep } from "node:timers/promises";
import { AuditLog } from "../src/audit.ts";
import type { Evidence, Extraction } from "../src/contracts.ts";
import { assembleEvidence } from "../src/evidence.ts";
import { MockGateway } from "../src/gateway.ts";
import type { LlmClient, LlmRequest } from "../src/llm.ts";
import type { Deps } from "../src/pipeline.ts";
import type { Permission } from "../src/policy.ts";
import { CaseStore, CommerceStore, seedDemoData } from "../src/store.ts";

export const NOW = new Date("2026-10-05T12:00:00.000Z");

type Reply = string | Error | ((req: LlmRequest) => string);

// Answers by task so concurrent cases cannot steal each other's scripted replies.
export class ScriptedLlm implements LlmClient {
  readonly name = "scripted";
  readonly requests: LlmRequest[] = [];
  #replies: Record<LlmRequest["task"], Reply[]>;
  #delayMs: number;

  constructor(replies: Partial<Record<LlmRequest["task"], Reply[]>>, delayMs = 0) {
    this.#replies = { extraction: replies.extraction ?? [], decision: replies.decision ?? [] };
    this.#delayMs = delayMs;
  }

  async complete(req: LlmRequest): Promise<string> {
    this.requests.push(req);
    if (this.#delayMs) await sleep(this.#delayMs);
    const r = this.#replies[req.task].shift();
    if (r === undefined) throw new Error(`ScriptedLlm: no ${req.task} reply left`);
    if (r instanceof Error) throw r;
    return typeof r === "function" ? r(req) : r;
  }
}

export interface TestDeps extends Deps {
  gateway: MockGateway;
}

export function makeDeps(llm: LlmClient, opts: { autoRefund?: boolean; now?: Date } = {}): TestDeps {
  const clock = () => opts.now ?? NOW;
  const commerce = new CommerceStore();
  seedDemoData(commerce, NOW);
  const permissions = new Set<Permission>(opts.autoRefund === false ? [] : ["refund:duplicate"]);
  return {
    commerce,
    cases: new CaseStore(),
    gateway: new MockGateway(commerce, clock),
    llm,
    audit: new AuditLog(clock),
    actor: { id: "test-agent", permissions },
    clock,
  };
}

export const extraction = (over: Partial<Extraction> = {}): string =>
  JSON.stringify({
    issueType: "duplicate_charge",
    orderId: "ORD-1001",
    claimedAmount: "$49.99",
    claimedCurrency: null,
    ...over,
  });

export const decision = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({
    action: "refund_duplicate",
    refundTransactionId: "tx_1001b",
    keepTransactionId: "tx_1001a",
    confidence: 0.95,
    rationale: "Two identical captures 90s apart.",
    citedEvidence: ["tx_1001a", "tx_1001b"],
    ...over,
  });

export function evidenceFor(orderId: string, customerId: string, claimedAmount: string | null = null): Evidence {
  const store = new CommerceStore();
  seedDemoData(store, NOW);
  const r = assembleEvidence(
    customerId,
    { issueType: "duplicate_charge", orderId, claimedAmount, claimedCurrency: null },
    store,
  );
  if (!r.ok) throw new Error(`evidenceFor failed: ${JSON.stringify(r.violations)}`);
  return r.evidence;
}
