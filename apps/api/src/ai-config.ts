// JARVIS AI env config.
// Parses/validates mode and model endpoint settings. Does not call any model.
// Secrets (JARVIS_MODEL_API_KEY) are never logged by this module.

export type AiMode = "fixture" | "vllm";
/** json_schema: send response_format (default). off: rely on the prompt alone; set explicitly, never auto-selected. */
export type StructuredOutputMode = "json_schema" | "off";

export interface AiConfig {
  mode: AiMode;
  /** Required when mode === "vllm". */
  modelBaseUrl: string | undefined;
  /** Required when mode === "vllm". */
  modelName: string | undefined;
  /** Optional; never logged. */
  modelApiKey: string | undefined;
  modelTimeoutMs: number;
  structuredOutput: StructuredOutputMode;
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
 * - JARVIS_MODEL_STRUCTURED_OUTPUT: json_schema | off (default json_schema)
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

  const structuredRaw = (env.JARVIS_MODEL_STRUCTURED_OUTPUT ?? "json_schema").trim().toLowerCase();
  if (structuredRaw !== "json_schema" && structuredRaw !== "off") {
    throw new AiConfigError(
      `JARVIS_MODEL_STRUCTURED_OUTPUT must be "json_schema" or "off" (got ${JSON.stringify(env.JARVIS_MODEL_STRUCTURED_OUTPUT)})`,
    );
  }
  const structuredOutput: StructuredOutputMode = structuredRaw;

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
    structuredOutput,
  };
}

function emptyToUndefined(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

const FIXTURE_ENGINE_TIMEOUT_MS = 10_000;
const CLIENT_BACKSTOP_MS = 2_000;

/**
 * Single source of truth for model-call timeouts.
 * - fixture: the engine keeps its 10s bound; no HTTP client is used.
 * - vllm: the engine uses JARVIS_MODEL_TIMEOUT_MS, and the HTTP client gets a later
 *   backstop, so the engine's own timer fires first and the case is classified
 *   MODEL_TIMEOUT / UNDERSTANDING_TIMEOUT instead of *_ERROR.
 */
export function resolveModelTimeouts(config: AiConfig): { engineTimeoutMs: number; clientTimeoutMs: number | null } {
  if (config.mode === "fixture") return { engineTimeoutMs: FIXTURE_ENGINE_TIMEOUT_MS, clientTimeoutMs: null };
  return { engineTimeoutMs: config.modelTimeoutMs, clientTimeoutMs: config.modelTimeoutMs + CLIENT_BACKSTOP_MS };
}

/** Endpoint for logs: scheme, host, port and path only (no credentials, query or fragment). */
export function sanitizeEndpoint(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return "[invalid url]";
  }
}

/** Safe summary for logs — never includes the API key or URL credentials. */
export function aiConfigSummary(config: AiConfig): Record<string, unknown> {
  return {
    mode: config.mode,
    modelEndpoint: config.modelBaseUrl ? sanitizeEndpoint(config.modelBaseUrl) : null,
    modelName: config.modelName ?? null,
    modelApiKeyConfigured: Boolean(config.modelApiKey),
    modelTimeoutMs: config.modelTimeoutMs,
    structuredOutput: config.structuredOutput,
  };
}
