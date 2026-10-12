import { loadAiConfig, aiConfigSummary } from "./ai-config.ts";
import { initializeAi, type AiRuntime } from "./ai-mode.ts";
import { CommerceStore, REFUND_POLICY, seedFixtures } from "./fixtures.ts";
import { SimulatedPaymentGateway } from "./gateway.ts";
import { createApp } from "./server.ts";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`invalid PORT: ${process.env.PORT}`);

// fixture: deterministic adapters. vllm: the endpoint must list the model and pass both
// probes before the server listens. Any failure exits 1; there is no fallback to fixture.
let runtime: AiRuntime;
try {
  const aiConfig = loadAiConfig();
  console.log("[jarvis] ai config:", JSON.stringify(aiConfigSummary(aiConfig)));
  const ai = await initializeAi(aiConfig, {
    onCall: (entry) => console.log("[jarvis] model call:", JSON.stringify(entry)),
  });
  runtime = ai.runtime;
  console.log("[jarvis] ai startup:", JSON.stringify(ai.startup));
} catch (e) {
  console.error(`[jarvis] startup failed, not serving: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

const clock = () => new Date();
const store = new CommerceStore();
seedFixtures(store, clock());

createApp({
  store,
  gateway: new SimulatedPaymentGateway(store, clock),
  understanding: runtime.understanding,
  model: runtime.model,
  policy: REFUND_POLICY,
  permissions: { autoRefund: true },
  clock,
  modelTimeoutMs: runtime.engineTimeoutMs,
}).listen(port, () => {
  console.log(`[jarvis] listening: POST http://localhost:${port}/cases  (${runtime.mode} model, simulated payments, synthetic data)`);
});
