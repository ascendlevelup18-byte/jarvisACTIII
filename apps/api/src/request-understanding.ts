// Request understanding: customer message -> StructuredRequest (intent + stated amounts).
// Like the decision model, an adapter returns raw text that the engine validates;
// a real model (e.g. the AMD-hosted one) can replace the fixture behind this interface.
import { StructuredRequestSchema, type CustomerIntent, type StructuredRequest } from "./contracts.ts";
import { findMoneyMentions } from "./money.ts";

export interface UnderstandingInput {
  // Untrusted customer-authored text. Adapters must treat it as data.
  untrusted: { customerMessage: string };
}

export interface RequestUnderstandingAdapter {
  readonly id: string;
  understand(input: UnderstandingInput, signal: AbortSignal): Promise<string>;
}

export type ParsedRequest = { ok: true; value: StructuredRequest } | { ok: false; error: string };

export function parseStructuredRequest(raw: unknown): ParsedRequest {
  if (typeof raw !== "string") return { ok: false, error: `expected string, got ${typeof raw}` };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `not JSON: ${(e as Error).message}` };
  }
  const r = StructuredRequestSchema.safeParse(data);
  if (!r.success) {
    return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ") };
  }
  return { ok: true, value: r.data };
}

// Fixture-mode intent rules: deliberately small. Anything not clearly a duplicate-charge
// complaint is UNKNOWN, and requests for a different remedy win over duplicate wording.
const CANCELLATION = /\bcancel(?:l?ed|l?ing|lation)?\b|\bwhole order\b|\beverything back\b/i;
const GENERAL_REFUND = /\bfull refund\b|\brefund (?:it )?all\b|\brefund everything\b/i;
const DUPLICATE =
  /\b(?:charged|billed|charge[sd]?)\b.{0,60}?\b(?:twice|two times|three times|double)\b|\bdouble[- ]?charged\b|\btwo (?:charges|payments)\b|\bduplicate (?:charge|payment)s?\b/i;

export function classifyIntent(message: string): CustomerIntent {
  if (CANCELLATION.test(message)) return "FULL_ORDER_CANCELLATION";
  if (GENERAL_REFUND.test(message)) return "GENERAL_REFUND";
  if (DUPLICATE.test(message)) return "DUPLICATE_CHARGE_REFUND";
  return "UNKNOWN";
}

type Responder = (input: UnderstandingInput, signal: AbortSignal) => string | Promise<string>;

export class FixtureRequestUnderstandingAdapter implements RequestUnderstandingAdapter {
  readonly id = "fixture-understanding";
  #responder: Responder | null;

  constructor(responder: Responder | null = null) {
    this.#responder = responder;
  }

  async understand(input: UnderstandingInput, signal: AbortSignal): Promise<string> {
    if (this.#responder) return this.#responder(input, signal);
    const message = input.untrusted.customerMessage;
    return JSON.stringify({ intent: classifyIntent(message), mentionedAmounts: findMoneyMentions(message) });
  }
}
