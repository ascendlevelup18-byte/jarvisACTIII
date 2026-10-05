import { AuditLog } from "./audit.ts";
import { loadConfig } from "./config.ts";
import { MockGateway } from "./gateway.ts";
import { OfflineLlm, VllmClient, type LlmClient } from "./llm.ts";
import type { Deps } from "./pipeline.ts";
import type { Permission } from "./policy.ts";
import { createApp } from "./server.ts";
import { CaseStore, CommerceStore, seedDemoData } from "./store.ts";

const config = loadConfig();
const clock = () => new Date();

const commerce = new CommerceStore();
if (config.SEED_DEMO_DATA) seedDemoData(commerce, clock());

const llm: LlmClient =
  config.LLM_MODE === "vllm"
    ? new VllmClient({
        baseUrl: config.VLLM_BASE_URL!,
        model: config.VLLM_MODEL!,
        apiKey: config.VLLM_API_KEY ?? null,
        timeoutMs: config.LLM_TIMEOUT_MS,
        structuredOutput: config.VLLM_STRUCTURED_OUTPUT,
      })
    : new OfflineLlm();

const permissions = new Set<Permission>(config.AUTO_REFUND_ENABLED ? ["refund:duplicate"] : []);

const deps: Deps = {
  commerce,
  cases: new CaseStore(),
  gateway: new MockGateway(commerce, clock),
  llm,
  audit: new AuditLog(clock, config.AUDIT_LOG_PATH ?? null),
  actor: { id: "jarvis-agent", permissions },
  clock,
};

createApp(deps, { autoRefundEnabled: config.AUTO_REFUND_ENABLED }).listen(config.PORT, () => {
  console.log(
    `[jarvis] listening on :${config.PORT} llm=${llm.name} autoRefund=${config.AUTO_REFUND_ENABLED}` +
      (config.LLM_MODE === "offline" ? "  (OFFLINE heuristic model, not for production)" : ""),
  );
});
