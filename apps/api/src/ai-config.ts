// JARVIS AI env config (pre-kickoff scaffold).
// Parses/validates mode and model endpoint settings. Does not call any model.
// Secrets (JARVIS_MODEL_API_KEY) are never logged by this module.

export type AiMode = "fixture" | "vllm";

export interface AiConfig {
  mode: AiMode;
  /** Required when mode === "vllm". */
  modelBaseUrl: string | undefined;
  /** Required when mode === "vllm". */
  modelName: string | undefined;
  /** Optional; never logged. */
  modelApiKey: string | undefined;
  modelTimeoutMs: number;
}

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Parse and validate AI-related environment variables.
 *
 * - JARVIS_AI_MODE: fixture | vllm (default fixture)
 * - JARVIS_MODEL_BASE_URL: required for vllm
 * - JARVIS_MODEL_NAME: required for vllm
 * - JARVIS_MODEL_API_KEY: optional
 * - JARVIS_MODEL_TIMEOUT_MS: positive int; invalid values fail; default 30000
 *
 * Fixture mode does not require an endpoint.
 */
export function loadAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const modeRaw = (env.JARVIS_AI_MODE ?? "fixture").trim().toLowerCase();
  if (modeRaw !== "fixture" && modeRaw !== "vllm") {
    throw new AiConfigError(
      `JARVIS_AI_MODE must be "fixture" or "vllm" (got ${JSON.stringify(env.JARVIS_AI_MODE)})`,
    );
  }
  const mode: AiMode = modeRaw;

  const timeoutRaw = env.JARVIS_MODEL_TIMEOUT_MS;
  let modelTimeoutMs = DEFAULT_TIMEOUT_MS;
  if (timeoutRaw !== undefined && timeoutRaw !== "") {
    const n = Number(timeoutRaw);
    if (!Number.isInteger(n) || n <= 0) {
      throw new AiConfigError(
        `JARVIS_MODEL_TIMEOUT_MS must be a positive integer (got ${JSON.stringify(timeoutRaw)})`,
      );
    }
    modelTimeoutMs = n;
  }

  const modelBaseUrl = emptyToUndefined(env.JARVIS_MODEL_BASE_URL);
  const modelName = emptyToUndefined(env.JARVIS_MODEL_NAME);
  const modelApiKey = emptyToUndefined(env.JARVIS_MODEL_API_KEY);

  if (mode === "vllm") {
    if (!modelBaseUrl) {
      throw new AiConfigError("JARVIS_AI_MODE=vllm requires JARVIS_MODEL_BASE_URL");
    }
    if (!modelName) {
      throw new AiConfigError("JARVIS_AI_MODE=vllm requires JARVIS_MODEL_NAME");
    }
    try {
      // Validate URL shape without logging the value in the error beyond the parse failure.
      new URL(modelBaseUrl);
    } catch {
      throw new AiConfigError("JARVIS_MODEL_BASE_URL must be a valid URL");
    }
  }

  return {
    mode,
    modelBaseUrl,
    modelName,
    modelApiKey,
    modelTimeoutMs,
  };
}

function emptyToUndefined(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

/** Safe summary for logs — never includes the API key. */
export function aiConfigSummary(config: AiConfig): Record<string, unknown> {
  return {
    mode: config.mode,
    modelBaseUrl: config.modelBaseUrl ?? null,
    modelName: config.modelName ?? null,
    modelApiKeyConfigured: Boolean(config.modelApiKey),
    modelTimeoutMs: config.modelTimeoutMs,
  };
}
