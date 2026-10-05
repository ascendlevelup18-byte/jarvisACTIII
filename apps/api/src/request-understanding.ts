// Request understanding: customer message -> StructuredRequest (intent + stated amounts).
// Like the decision model, an adapter returns raw text that the engine validates;
// a real model (e.g. the AMD-hosted one) can replace the fixture behind this interface.
import { StructuredRequestSchema, type CustomerIntent, type StructuredRequest } from "./contracts.ts";
import { findIntentCues, OUT_OF_SCOPE_CUES } from "./intent-cues.ts";
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

// Fixture-mode intent rules, built on the same deterministic cues as the safety
// backstop. Anything not clearly a duplicate-charge complaint is UNKNOWN, and
// requests for a different remedy win over duplicate wording.
export function classifyIntent(message: string): CustomerIntent {
  const cues = findIntentCues(message);
  const found = OUT_OF_SCOPE_CUES.filter((c) => cues.outOfScope.includes(c.cue));
  if (found.some((c) => c.kind === "FULL_ORDER_CANCELLATION")) return "FULL_ORDER_CANCELLATION";
  if (found.some((c) => c.kind === "GENERAL_REFUND")) return "GENERAL_REFUND";
  return cues.duplicateCharge ? "DUPLICATE_CHARGE_REFUND" : "UNKNOWN";
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
