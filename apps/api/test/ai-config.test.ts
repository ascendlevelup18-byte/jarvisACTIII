import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AiConfigError, aiConfigSummary, loadAiConfig } from "../src/ai-config.ts";
import { AiStartupGuardError, assertAiModeReadyForPreKickoff, declareAiMode } from "../src/ai-mode.ts";

describe("loadAiConfig", () => {
  test("defaults to fixture with no endpoint required", () => {
    const cfg = loadAiConfig({});
    assert.equal(cfg.mode, "fixture");
    assert.equal(cfg.modelBaseUrl, undefined);
    assert.equal(cfg.modelName, undefined);
    assert.equal(cfg.modelApiKey, undefined);
    assert.equal(cfg.modelTimeoutMs, 30_000);
  });

  test("explicit fixture ignores missing model URL", () => {
    const cfg = loadAiConfig({ JARVIS_AI_MODE: "fixture" });
    assert.equal(cfg.mode, "fixture");
  });

  test("invalid timeout fails", () => {
    assert.throws(() => loadAiConfig({ JARVIS_MODEL_TIMEOUT_MS: "0" }), AiConfigError);
    assert.throws(() => loadAiConfig({ JARVIS_MODEL_TIMEOUT_MS: "-1" }), AiConfigError);
    assert.throws(() => loadAiConfig({ JARVIS_MODEL_TIMEOUT_MS: "nope" }), AiConfigError);
  });

  test("vllm requires base URL and model name", () => {
    assert.throws(() => loadAiConfig({ JARVIS_AI_MODE: "vllm" }), /JARVIS_MODEL_BASE_URL/);
    assert.throws(
      () => loadAiConfig({ JARVIS_AI_MODE: "vllm", JARVIS_MODEL_BASE_URL: "http://host:8000/v1" }),
      /JARVIS_MODEL_NAME/,
    );
  });

  test("vllm accepts optional API key", () => {
    const cfg = loadAiConfig({
      JARVIS_AI_MODE: "vllm",
      JARVIS_MODEL_BASE_URL: "http://host:8000/v1",
      JARVIS_MODEL_NAME: "my-model",
      JARVIS_MODEL_API_KEY: "sk-test",
      JARVIS_MODEL_TIMEOUT_MS: "15000",
    });
    assert.equal(cfg.mode, "vllm");
    assert.equal(cfg.modelBaseUrl, "http://host:8000/v1");
    assert.equal(cfg.modelName, "my-model");
    assert.equal(cfg.modelApiKey, "sk-test");
    assert.equal(cfg.modelTimeoutMs, 15_000);
  });

  test("summary never includes API key value", () => {
    const cfg = loadAiConfig({
      JARVIS_AI_MODE: "vllm",
      JARVIS_MODEL_BASE_URL: "http://host:8000/v1",
      JARVIS_MODEL_NAME: "my-model",
      JARVIS_MODEL_API_KEY: "sk-super-secret",
    });
    const summary = JSON.stringify(aiConfigSummary(cfg));
    assert.ok(!summary.includes("sk-super-secret"));
    assert.equal(aiConfigSummary(cfg).modelApiKeyConfigured, true);
  });

  test("rejects unknown mode", () => {
    assert.throws(() => loadAiConfig({ JARVIS_AI_MODE: "openai" }), AiConfigError);
  });
});

describe("assertAiModeReadyForPreKickoff", () => {
  test("fixture starts (declaration ready)", () => {
    const cfg = loadAiConfig({ JARVIS_AI_MODE: "fixture" });
    const decl = assertAiModeReadyForPreKickoff(cfg);
    assert.equal(decl.mode, "fixture");
    assert.equal(decl.fixtureAdaptersReady, true);
    assert.equal(decl.vllmAdaptersReady, false);
  });

  test("vllm refuses with clear message and does not fall back", () => {
    const cfg = loadAiConfig({
      JARVIS_AI_MODE: "vllm",
      JARVIS_MODEL_BASE_URL: "http://host:8000/v1",
      JARVIS_MODEL_NAME: "my-model",
    });
    const decl = declareAiMode(cfg);
    assert.equal(decl.mode, "vllm");
    assert.equal(decl.vllmAdaptersReady, false);

    assert.throws(() => assertAiModeReadyForPreKickoff(cfg), (err: unknown) => {
      assert.ok(err instanceof AiStartupGuardError);
      assert.match(err.message, /not implemented/i);
      assert.match(err.message, /VllmRequestUnderstandingAdapter/);
      assert.match(err.message, /VllmModelAdapter/);
      assert.match(err.message, /Refusing to start/i);
      assert.match(err.message, /Do not fall back to fixture/i);
      return true;
    });
  });
});
