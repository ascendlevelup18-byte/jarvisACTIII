import { z } from "zod";

const bool = (def: "true" | "false") =>
  z
    .enum(["true", "false"])
    .default(def)
    .transform((v) => v === "true");

const EnvSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LLM_MODE: z.enum(["vllm", "offline"]).default("offline"),
    VLLM_BASE_URL: z.url().optional(),
    VLLM_MODEL: z.string().min(1).optional(),
    VLLM_API_KEY: z.string().min(1).optional(),
    VLLM_STRUCTURED_OUTPUT: bool("true"),
    LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    // Kill switch. Off by default: refunds require an explicit opt-in.
    AUTO_REFUND_ENABLED: bool("false"),
    AUDIT_LOG_PATH: z.string().min(1).optional(),
    SEED_DEMO_DATA: bool("true"),
  })
  .superRefine((env, ctx) => {
    if (env.LLM_MODE === "vllm" && (!env.VLLM_BASE_URL || !env.VLLM_MODEL)) {
      ctx.addIssue({ code: "custom", message: "LLM_MODE=vllm requires VLLM_BASE_URL and VLLM_MODEL" });
    }
  });

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`).join("\n");
    throw new Error(`Invalid configuration:\n${msg}`);
  }
  return parsed.data;
}
