// Model access. The only contract: given a request, return raw text.
// Parsing/validation of that text is done by `parseStructured`, never trusted as-is.
import type { z } from "zod";

export interface LlmRequest {
  task: "extraction" | "decision";
  system: string;
  user: string;
  jsonSchema: Record<string, unknown>;
}

export interface LlmClient {
  readonly name: string;
  complete(req: LlmRequest): Promise<string>;
}

export interface VllmOptions {
  baseUrl: string; // OpenAI-compatible root, e.g. http://host:8000/v1
  model: string;
  apiKey: string | null;
  timeoutMs: number;
  // Sends OpenAI-style response_format json_schema (vLLM structured outputs).
  // Disable if the deployed vLLM version rejects it; output is validated either way.
  structuredOutput: boolean;
}

export class VllmClient implements LlmClient {
  readonly name: string;
  #opts: VllmOptions;

  constructor(opts: VllmOptions) {
    this.#opts = { ...opts, baseUrl: opts.baseUrl.replace(/\/+$/, "") };
    this.name = `vllm:${opts.model}`;
  }

  async complete(req: LlmRequest): Promise<string> {
    const { baseUrl, model, apiKey, timeoutMs, structuredOutput } = this.#opts;
    const body: Record<string, unknown> = {
      model,
      temperature: 0,
      max_tokens: 1024,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    };
    if (structuredOutput) {
      body.response_format = {
        type: "json_schema",
        json_schema: { name: req.task, schema: req.jsonSchema, strict: true },
      };
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      throw new Error(`vLLM HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("vLLM response missing choices[0].message.content");
    return content;
  }
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

// Tolerates the two common wrappers open models add (reasoning blocks, code fences);
// everything else must be exactly the schema.
export function parseStructured<T>(raw: string, schema: z.ZodType<T>): Parsed<T> {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(text);
  if (fence) text = fence[1]!;

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `not JSON: ${(e as Error).message}` };
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ") };
  }
  return { ok: true, value: result.data };
}

// Deterministic stand-in for local development without a GPU. Not used in prod.
export class OfflineLlm implements LlmClient {
  readonly name = "offline-heuristic";

  async complete(req: LlmRequest): Promise<string> {
    const input = JSON.parse(req.user) as {
      customerMessage: string;
      evidence?: { duplicateGroups: { transactionIds: string[] }[] };
    };

    if (req.task === "extraction") {
      const msg = input.customerMessage;
      const orderId = /#?\b(ORD-\d+)\b/i.exec(msg)?.[1]?.toUpperCase() ?? null;
      const amount = /([$€£])\s?(\d[\d,]*(?:\.\d{1,2})?)/.exec(msg);
      const duplicate = /\b(twice|double|duplicate|two times|charged 2)/i.test(msg);
      return JSON.stringify({
        issueType: duplicate ? "duplicate_charge" : "other",
        orderId,
        claimedAmount: amount ? `${amount[1]}${amount[2]}` : null,
        claimedCurrency: null,
      });
    }

    const group = input.evidence?.duplicateGroups[0];
    if (!group) {
      return JSON.stringify({
        action: "no_action",
        refundTransactionId: null,
        keepTransactionId: null,
        confidence: 0.9,
        rationale: "No duplicate group in the records.",
        citedEvidence: [],
      });
    }
    const ids = group.transactionIds;
    return JSON.stringify({
      action: "refund_duplicate",
      refundTransactionId: ids.at(-1),
      keepTransactionId: ids[0],
      confidence: 0.9,
      rationale: "Identical captured charges within the duplicate window; refund the later one.",
      citedEvidence: ids,
    });
  }
}
