// Fixture / vLLM mode declaration and pre-kickoff startup guard.
// vLLM mode MUST refuse to start — adapters are not implemented in this build.
// Never silently fall back to fixture when JARVIS_AI_MODE=vllm.

import type { AiConfig, AiMode } from "./ai-config.ts";

export interface AiModeDeclaration {
  mode: AiMode;
  /** True only when fixture adapters are wired for this build. */
  fixtureAdaptersReady: boolean;
  /**
   * True only when VllmRequestUnderstandingAdapter + VllmModelAdapter exist
   * and are wired. Always false in the pre-kickoff scaffold.
   */
  vllmAdaptersReady: boolean;
  label: string;
}

/**
 * Declare which AI mode is configured and whether adapters exist for it.
 * Pre-kickoff: only fixture adapters are ready.
 */
export function declareAiMode(config: AiConfig): AiModeDeclaration {
  if (config.mode === "fixture") {
    return {
      mode: "fixture",
      fixtureAdaptersReady: true,
      vllmAdaptersReady: false,
      label: "fixture (deterministic adapters; no remote model)",
    };
  }
  return {
    mode: "vllm",
    fixtureAdaptersReady: true,
    vllmAdaptersReady: false,
    label: "vllm (OpenAI-compatible endpoint configured; adapters NOT implemented in pre-kickoff)",
  };
}

export class AiStartupGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiStartupGuardError";
  }
}

/**
 * Startup guard for pre-kickoff builds.
 * - fixture: allow start
 * - vllm: refuse with a clear message — no silent fallback to fixture
 */
export function assertAiModeReadyForPreKickoff(config: AiConfig): AiModeDeclaration {
  const declaration = declareAiMode(config);
  if (config.mode === "vllm") {
    throw new AiStartupGuardError(
      [
        "JARVIS_AI_MODE=vllm is configured, but vLLM adapters are not implemented in this pre-kickoff build.",
        "Missing: VllmRequestUnderstandingAdapter, VllmModelAdapter, JARVIS prompts, and schema-to-model mapping.",
        "Refusing to start. Do not fall back to fixture while mode is vllm.",
        "Set JARVIS_AI_MODE=fixture for local fixture operation, or wait for the kickoff adapter implementation.",
      ].join(" "),
    );
  }
  return declaration;
}
