import { loadAiConfig, aiConfigSummary } from "./ai-config.ts";
import { assertAiModeReadyForPreKickoff } from "./ai-mode.ts";
import { CommerceStore, REFUND_POLICY, seedFixtures } from "./fixtures.ts";
import { SimulatedPaymentGateway } from "./gateway.ts";
import { FixtureModelAdapter } from "./model-adapter.ts";
import { FixtureRequestUnderstandingAdapter } from "./request-understanding.ts";
import { createApp } from "./server.ts";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`invalid PORT: ${process.env.PORT}`);

// Pre-kickoff AI mode: fixture starts; vllm refuses (adapters not implemented). No silent fallback.
const aiConfig = loadAiConfig();
const aiMode = assertAiModeReadyForPreKickoff(aiConfig);
console.log("[jarvis] ai:", JSON.stringify(aiConfigSummary(aiConfig)), `(${aiMode.label})`);

const clock = () => new Date();
const store = new CommerceStore();
seedFixtures(store, clock());

createApp({
  store,
  gateway: new SimulatedPaymentGateway(store, clock),
  understanding: new FixtureRequestUnderstandingAdapter(),
  model: new FixtureModelAdapter(),
  policy: REFUND_POLICY,
  permissions: { autoRefund: true },
  clock,
  modelTimeoutMs: 10_000,
}).listen(port, () => {
  console.log(`[jarvis] POST http://localhost:${port}/cases  (fixture model, simulated payments, synthetic data)`);
});
