import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  cleanupModelContent,
  OpenAICompatibleClient,
  ProviderError,
  redactSecrets,
} from "../src/provider/index.ts";
import { startFakeOpenAIServer, type FakeOpenAIServer } from "./fake-openai-server.ts";

describe("OpenAICompatibleClient", () => {
  let fake: FakeOpenAIServer;

  before(async () => {
    fake = await startFakeOpenAIServer({ kind: "ok", content: '{"hello":true}' });
  });

  after(async () => {
    await fake.close();
  });

  test("200 returns choices[0].message.content", async () => {
    fake.setScenario({ kind: "ok", content: '{"hello":true}', model: "test-model" });
    const client = new OpenAICompatibleClient({
      baseUrl: fake.baseUrl,
      model: "test-model",
      timeoutMs: 5_000,
    });
    const result = await client.chatCompletions({
      messages: [{ role: "user", content: "hi" }],
    });
    assert.equal(result.content, '{"hello":true}');
    assert.equal(result.model, "test-model");
  });

  test("malformed JSON -> INVALID_JSON", async () => {
    fake.setScenario({ kind: "malformed_json" });
    const client = new OpenAICompatibleClient({
      baseUrl: fake.baseUrl,
      model: "m",
      timeoutMs: 5_000,
    });
    await assert.rejects(
      () => client.chatCompletions({ messages: [{ role: "user", content: "x" }] }),
      (err: unknown) => {
        assert.ok(err instanceof ProviderError);
        assert.equal(err.category, "INVALID_JSON");
        return true;
      },
    );
  });

  test("hang / timeout -> TIMEOUT", async () => {
    fake.setScenario({ kind: "hang" });
    const client = new OpenAICompatibleClient({
      baseUrl: fake.baseUrl,
      model: "m",
      timeoutMs: 150,
    });
    await assert.rejects(
      () => client.chatCompletions({ messages: [{ role: "user", content: "x" }] }),
      (err: unknown) => {
        assert.ok(err instanceof ProviderError);
        assert.equal(err.category, "TIMEOUT");
        return true;
      },
    );
  });

  test("K4: listModels returns served model ids and sends the bearer key", async () => {
    fake.setModelsScenario({ kind: "list", ids: ["jarvis-main", "other"] });
    const client = new OpenAICompatibleClient({ baseUrl: fake.baseUrl, model: "jarvis-main", apiKey: "sk-test-models-key-123456", timeoutMs: 5_000 });
    assert.deepEqual(await client.listModels(), ["jarvis-main", "other"]);
    assert.equal(fake.lastAuthorization, "Bearer sk-test-models-key-123456");
  });

  const modelsFailures = [
    [{ kind: "http_status", status: 401 }, "HTTP_4XX"],
    [{ kind: "http_status", status: 503 }, "HTTP_5XX"],
    [{ kind: "malformed_json" }, "INVALID_JSON"],
    [{ kind: "unexpected_shape", body: { object: "list", data: [{ name: "no-id" }] } }, "INVALID_PROVIDER_RESPONSE"],
    [{ kind: "large", bytes: 50_000 }, "RESPONSE_TOO_LARGE"],
  ] as const;
  for (const [scenario, category] of modelsFailures) {
    test(`K4: listModels ${scenario.kind}${"status" in scenario ? ` ${scenario.status}` : ""} -> ${category}`, async () => {
      fake.setModelsScenario(scenario);
      const client = new OpenAICompatibleClient({ baseUrl: fake.baseUrl, model: "m", timeoutMs: 5_000, maxResponseBytes: 8_192 });
      await assert.rejects(
        () => client.listModels(),
        (err: unknown) => {
          assert.ok(err instanceof ProviderError);
          assert.equal(err.category, category);
          return true;
        },
      );
    });
  }

  test("K4: listModels connection failure -> CONNECTION_ERROR", async () => {
    const client = new OpenAICompatibleClient({ baseUrl: "http://127.0.0.1:9", model: "m", timeoutMs: 1_000 });
    await assert.rejects(
      () => client.listModels(),
      (err: unknown) => err instanceof ProviderError && err.category === "CONNECTION_ERROR",
    );
  });

  test("K1: finish_reason stop is returned with token usage", async () => {
    fake.setScenario({ kind: "ok", content: '{"a":1}' });
    const client = new OpenAICompatibleClient({ baseUrl: fake.baseUrl, model: "m", timeoutMs: 5_000 });
    const result = await client.chatCompletions({ messages: [{ role: "user", content: "x" }] });
    assert.equal(result.finishReason, "stop");
    assert.deepEqual(result.usage, { promptTokens: 11, completionTokens: 7, totalTokens: 18 });
  });

  for (const reason of ["length", "content_filter", "tool_calls", "something_new"] as const) {
    test(`K1: finish_reason ${reason} -> INVALID_PROVIDER_RESPONSE (truncated/unusable output)`, async () => {
      fake.setScenario({ kind: "ok", content: '{"action":"REFUND_DUP', finishReason: reason });
      const client = new OpenAICompatibleClient({ baseUrl: fake.baseUrl, model: "m", timeoutMs: 5_000 });
      await assert.rejects(
        () => client.chatCompletions({ messages: [{ role: "user", content: "x" }] }),
        (err: unknown) => {
          assert.ok(err instanceof ProviderError);
          assert.equal(err.category, "INVALID_PROVIDER_RESPONSE");
          assert.match(err.message, new RegExp(`finish_reason=${reason}`));
          return true;
        },
      );
    });
  }

  test("K1: absent finish_reason is accepted (finishReason undefined)", async () => {
    fake.setScenario({ kind: "unexpected_shape", body: { choices: [{ message: { content: '{"a":1}' } }] } });
    const client = new OpenAICompatibleClient({ baseUrl: fake.baseUrl, model: "m", timeoutMs: 5_000 });
    const result = await client.chatCompletions({ messages: [{ role: "user", content: "x" }] });
    assert.equal(result.content, '{"a":1}');
    assert.equal(result.finishReason, undefined);
  });

  test("K1: refusal with null content -> INVALID_PROVIDER_RESPONSE", async () => {
    fake.setScenario({
      kind: "unexpected_shape",
      body: { choices: [{ message: { content: null, refusal: "I can't help" }, finish_reason: "stop" }] },
    });
    const client = new OpenAICompatibleClient({ baseUrl: fake.baseUrl, model: "m", timeoutMs: 5_000 });
    await assert.rejects(
      () => client.chatCompletions({ messages: [{ role: "user", content: "x" }] }),
      (err: unknown) => err instanceof ProviderError && err.category === "INVALID_PROVIDER_RESPONSE",
    );
  });

  test("K3: body stalls after headers -> TIMEOUT ProviderError (not a raw TimeoutError)", async () => {
    fake.setScenario({ kind: "body_stall" });
    const client = new OpenAICompatibleClient({
      baseUrl: fake.baseUrl,
      model: "m",
      timeoutMs: 200,
    });
    await assert.rejects(
      () => client.chatCompletions({ messages: [{ role: "user", content: "x" }] }),
      (err: unknown) => {
        assert.ok(err instanceof ProviderError, `expected ProviderError, got ${(err as Error)?.name}`);
        assert.equal(err.category, "TIMEOUT");
        return true;
      },
    );
  });

  test("connection failure -> CONNECTION_ERROR", async () => {
    // Nothing listening on this port.
    const client = new OpenAICompatibleClient({
      baseUrl: "http://127.0.0.1:9",
      model: "m",
      timeoutMs: 1_000,
    });
    await assert.rejects(
      () => client.chatCompletions({ messages: [{ role: "user", content: "x" }] }),
      (err: unknown) => {
        assert.ok(err instanceof ProviderError);
        assert.equal(err.category, "CONNECTION_ERROR");
        return true;
      },
    );
  });

  for (const status of [400, 401, 429] as const) {
    test(`HTTP ${status} -> HTTP_4XX`, async () => {
      fake.setScenario({ kind: "http_status", status });
      const client = new OpenAICompatibleClient({
        baseUrl: fake.baseUrl,
        model: "m",
        timeoutMs: 5_000,
      });
      await assert.rejects(
        () => client.chatCompletions({ messages: [{ role: "user", content: "x" }] }),
        (err: unknown) => {
          assert.ok(err instanceof ProviderError);
          assert.equal(err.category, "HTTP_4XX");
          assert.equal(err.statusCode, status);
          return true;
        },
      );
    });
  }

  for (const status of [500, 503] as const) {
    test(`HTTP ${status} -> HTTP_5XX`, async () => {
      fake.setScenario({ kind: "http_status", status });
      const client = new OpenAICompatibleClient({
        baseUrl: fake.baseUrl,
        model: "m",
        timeoutMs: 5_000,
      });
      await assert.rejects(
        () => client.chatCompletions({ messages: [{ role: "user", content: "x" }] }),
        (err: unknown) => {
          assert.ok(err instanceof ProviderError);
          assert.equal(err.category, "HTTP_5XX");
          assert.equal(err.statusCode, status);
          return true;
        },
      );
    });
  }

  test("unexpected shape -> INVALID_PROVIDER_RESPONSE", async () => {
    fake.setScenario({ kind: "unexpected_shape", body: { ok: true, data: null } });
    const client = new OpenAICompatibleClient({
      baseUrl: fake.baseUrl,
      model: "m",
      timeoutMs: 5_000,
    });
    await assert.rejects(
      () => client.chatCompletions({ messages: [{ role: "user", content: "x" }] }),
      (err: unknown) => {
        assert.ok(err instanceof ProviderError);
        assert.equal(err.category, "INVALID_PROVIDER_RESPONSE");
        return true;
      },
    );
  });

  test("large response -> RESPONSE_TOO_LARGE", async () => {
    fake.setScenario({ kind: "large", bytes: 50_000 });
    const client = new OpenAICompatibleClient({
      baseUrl: fake.baseUrl,
      model: "m",
      timeoutMs: 5_000,
      maxResponseBytes: 8_192,
    });
    await assert.rejects(
      () => client.chatCompletions({ messages: [{ role: "user", content: "x" }] }),
      (err: unknown) => {
        assert.ok(err instanceof ProviderError);
        assert.equal(err.category, "RESPONSE_TOO_LARGE");
        return true;
      },
    );
  });

  test("text around JSON is returned as raw content (no schema interpretation)", async () => {
    const wrapped = 'Sure! Here is the JSON:\n{"a":1}\nThanks.';
    fake.setScenario({ kind: "text_around_json", content: wrapped });
    const client = new OpenAICompatibleClient({
      baseUrl: fake.baseUrl,
      model: "m",
      timeoutMs: 5_000,
    });
    const result = await client.chatCompletions({
      messages: [{ role: "user", content: "x" }],
    });
    assert.equal(result.content, wrapped);
  });

  test("API key is sent as Bearer but never appears in errors", async () => {
    const secret = "sk-super-secret-test-key-do-not-leak";
    fake.setScenario({ kind: "http_status", status: 401, body: JSON.stringify({ error: "unauthorized" }) });
    const client = new OpenAICompatibleClient({
      baseUrl: fake.baseUrl,
      model: "m",
      apiKey: secret,
      timeoutMs: 5_000,
    });
    try {
      await client.chatCompletions({ messages: [{ role: "user", content: "x" }] });
      assert.fail("expected reject");
    } catch (err) {
      assert.ok(err instanceof ProviderError);
      assert.equal(err.category, "HTTP_4XX");
      assert.ok(!err.message.includes(secret), "error message leaked API key");
      assert.ok(!JSON.stringify(err.toJSON()).includes(secret), "toJSON leaked API key");
    }
    assert.equal(fake.lastAuthorization, `Bearer ${secret}`);
  });

  test("CONFIG_ERROR for missing baseUrl / model / timeout", () => {
    assert.throws(
      () => new OpenAICompatibleClient({ baseUrl: "", model: "m", timeoutMs: 1000 }),
      (err: unknown) => err instanceof ProviderError && err.category === "CONFIG_ERROR",
    );
    assert.throws(
      () => new OpenAICompatibleClient({ baseUrl: "http://x", model: "", timeoutMs: 1000 }),
      (err: unknown) => err instanceof ProviderError && err.category === "CONFIG_ERROR",
    );
    assert.throws(
      () => new OpenAICompatibleClient({ baseUrl: "http://x", model: "m", timeoutMs: 0 }),
      (err: unknown) => err instanceof ProviderError && err.category === "CONFIG_ERROR",
    );
  });
});

describe("cleanupModelContent", () => {
  test("strips markdown code fences", () => {
    assert.equal(cleanupModelContent('```json\n{"a":1}\n```'), '{"a":1}');
    assert.equal(cleanupModelContent('```\n{"a":1}\n```'), '{"a":1}');
  });

  test("strips reasoning blocks when enabled", () => {
    const raw = '<think>secret</think>\n{"ok":true}';
    assert.equal(cleanupModelContent(raw), '{"ok":true}');
    assert.equal(cleanupModelContent(raw, { stripReasoningBlocks: false }), raw.trim());
  });

  test("leaves text-around-JSON unchanged (no JARVIS schema parse)", () => {
    const raw = 'Here you go: {"a":1} done';
    assert.equal(cleanupModelContent(raw), raw);
  });
});

describe("redactSecrets", () => {
  test("redacts bearer tokens and api_key values", () => {
    assert.match(redactSecrets("Authorization: Bearer sk-abc123"), /\[REDACTED\]/);
    assert.match(redactSecrets('api_key: "sk-abc123"'), /\[REDACTED\]/);
    assert.ok(!redactSecrets("Bearer sk-abc123").includes("sk-abc123"));
  });
});
