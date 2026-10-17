import { loadAiConfig, aiConfigSummary } from "./ai-config.ts";
import { initializeAi, type AiRuntime, type AiStartupReport, type ModelCallLog } from "./ai-mode.ts";
import { freshWorld } from "./ingress.ts";
import { loadIngressSecurity, LocalInferenceLimiter, type IngressSecurityConfig } from "./limits.ts";
import { createApp } from "./server.ts";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`invalid PORT: ${process.env.PORT}`);

// Provider diagnostics for /api/health: counts and the last call, no prompts or keys.
const providerCalls = { ok: 0, failed: 0, last: null as (ModelCallLog & { at: string }) | null };

// fixture: deterministic adapters. vllm: the endpoint must list the model and pass both
// probes before the server listens, and a daily model-call budget must be configured.
// Any failure exits 1; there is no fallback to fixture.
let runtime: AiRuntime;
let startup: AiStartupReport;
let security: IngressSecurityConfig;
try {
  const aiConfig = loadAiConfig();
  security = loadIngressSecurity(process.env, aiConfig.mode);
  console.log("[jarvis] ai config:", JSON.stringify(aiConfigSummary(aiConfig)));
  console.log(
    "[jarvis] ingress:",
    JSON.stringify({ freeText: security.accessToken ? "token required" : "disabled", limits: security.limits, trustProxy: security.trustProxy }),
  );
  const ai = await initializeAi(aiConfig, {
    onCall: (entry) => {
      console.log("[jarvis] model call:", JSON.stringify(entry));
      providerCalls[entry.failureCategory ? "failed" : "ok"]++;
      providerCalls.last = { ...entry, at: new Date().toISOString() };
    },
  });
  runtime = ai.runtime;
  startup = ai.startup;
  console.log("[jarvis] ai startup:", JSON.stringify(startup));
} catch (e) {
  console.error(`[jarvis] startup failed, not serving: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

const clock = () => new Date();
// Privileged free-text cases share one persistent synthetic world; demo runs get a fresh one each.
const persistent = freshWorld(clock);

createApp(
  {
    aiMode: runtime.mode,
    understanding: runtime.understanding,
    model: runtime.model,
    engineTimeoutMs: runtime.engineTimeoutMs,
    modelCallsPerCase: runtime.modelCallsPerCase,
    accessToken: security.accessToken,
    limiter: new LocalInferenceLimiter(security.limits),
    privilegedWorld: () => persistent,
    clock,
    log: (entry) => console.log("[jarvis] case:", JSON.stringify(entry)),
  },
  {
    trustProxy: security.trustProxy,
    health: () => ({
      ok: true,
      service: "jarvis",
      deployment: "node-server",
      aiMode: runtime.mode,
      model: startup.model,
      models: runtime.mode === "vllm" ? { understanding: startup.understandingModel, decision: startup.model } : null,
      remoteModel: runtime.mode === "vllm",
      paymentGateway: "simulated",
      data: "synthetic",
      freeText: security.accessToken ? "token required" : "disabled",
      limits: { ...security.limits, scope: "this process", modelCallsReservedPerCase: runtime.modelCallsPerCase },
      provider:
        runtime.mode === "vllm"
          ? {
              endpoint: startup.endpoint,
              model: startup.model,
              understandingModel: startup.understandingModel,
              structuredOutput: startup.structuredOutput,
              understandingStructuredOutput: startup.understandingStructuredOutput,
              maxRetries: startup.maxRetries,
              startupProbes: startup.probes,
              calls: { ok: providerCalls.ok, failed: providerCalls.failed },
              lastCall: providerCalls.last,
            }
          : null,
    }),
  },
).listen(port, () => {
  console.log(`[jarvis] listening: POST http://localhost:${port}/cases  (${runtime.mode} model, simulated payments, synthetic data)`);
});
