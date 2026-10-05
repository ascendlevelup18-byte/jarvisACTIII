import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { DecisionSchema, ExtractionSchema } from "../src/contracts.ts";
import { parseStructured, VllmClient } from "../src/llm.ts";
import { processCase } from "../src/pipeline.ts";
import { decisionRequest, extractionRequest } from "../src/prompts.ts";
import { decision, evidenceFor, extraction, makeDeps } from "./helpers.ts";

test("parseStructured: plain, fenced and reasoning-prefixed JSON", () => {
  assert.ok(parseStructured(extraction(), ExtractionSchema).ok);
  assert.ok(parseStructured("```json\n" + extraction() + "\n```", ExtractionSchema).ok);
  assert.ok(parseStructured("<think>hmm, order id...</think>\n" + decision(), DecisionSchema).ok);
});

test("parseStructured: rejects prose, extra keys and wrong types", () => {
  const prose = parseStructured("Sure! I'll refund tx_1001b.", DecisionSchema);
  assert.ok(!prose.ok && prose.error.startsWith("not JSON"));
  const extra = parseStructured(decision({ refundAmountMinor: 500000 }), DecisionSchema);
  assert.ok(!extra.ok);
  const wrongType = parseStructured(decision({ confidence: "high" }), DecisionSchema);
  assert.ok(!wrongType.ok && wrongType.error.includes("confidence"));
  const badEnum = parseStructured(decision({ action: "refund_everything" }), DecisionSchema);
  assert.ok(!badEnum.ok);
});

// --- VllmClient against a local fake OpenAI-compatible server ---

let server: Server;
let baseUrl: string;
let lastRequest: { url: string; headers: IncomingMessage["headers"]; body: Record<string, unknown> } | null = null;
let mode: "ok" | "500" | "hang" | "no_content" = "ok";

before(async () => {
  server = createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    lastRequest = { url: req.url ?? "", headers: req.headers, body: JSON.parse(raw) };
    if (mode === "hang") return; // never respond
    if (mode === "500") {
      res.writeHead(500).end("model crashed");
      return;
    }
    const content = mode === "ok" ? extraction() : undefined;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});

const client = (over: Partial<ConstructorParameters<typeof VllmClient>[0]> = {}) =>
  new VllmClient({ baseUrl, model: "test-model", apiKey: "k-test", timeoutMs: 2000, structuredOutput: true, ...over });

test("VllmClient sends an OpenAI-compatible request with structured output", async () => {
  mode = "ok";
  const out = await client().complete(extractionRequest("charged twice ORD-1001"));
  assert.equal(out, extraction());
  assert.ok(lastRequest);
  assert.equal(lastRequest.url, "/v1/chat/completions");
  assert.equal(lastRequest.headers.authorization, "Bearer k-test");
  assert.equal(lastRequest.body.model, "test-model");
  assert.equal(lastRequest.body.temperature, 0);
  const rf = lastRequest.body.response_format as { type: string; json_schema: { name: string; schema: unknown } };
  assert.equal(rf.type, "json_schema");
  assert.equal(rf.json_schema.name, "extraction");
  assert.ok(rf.json_schema.schema);
});

test("VllmClient omits response_format when disabled and no auth header without key", async () => {
  mode = "ok";
  await client({ structuredOutput: false, apiKey: null }).complete(
    decisionRequest("x", evidenceFor("ORD-1001", "cus_alice")),
  );
  assert.equal(lastRequest?.body.response_format, undefined);
  assert.equal(lastRequest?.headers.authorization, undefined);
});

test("VllmClient surfaces HTTP errors, missing content and timeouts", async () => {
  mode = "500";
  await assert.rejects(client().complete(extractionRequest("x")), /vLLM HTTP 500: model crashed/);
  mode = "no_content";
  await assert.rejects(client().complete(extractionRequest("x")), /missing choices/);
  mode = "hang";
  await assert.rejects(client({ timeoutMs: 100 }).complete(extractionRequest("x")), (e: Error) =>
    ["TimeoutError", "AbortError"].includes(e.name),
  );
});

test("model timeout inside the pipeline escalates as llm_unavailable", async () => {
  mode = "hang";
  const deps = makeDeps(client({ timeoutMs: 100 }));
  const c = await processCase({ customerId: "cus_alice", message: "charged twice ORD-1001" }, deps);
  assert.equal(c.state, "escalated");
  assert.deepEqual(
    c.escalation?.reasons.map((r) => r.code),
    ["llm_unavailable"],
  );
  assert.ok(deps.audit.forCase(c.id).some((e) => e.type === "llm.extraction.error"));
});
