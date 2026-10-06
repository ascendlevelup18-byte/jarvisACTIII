/**
 * Fixture-benchmark metrics only — from the verified post-hardening bench run.
 * Labeled as internal fixture results. Never present as live AMD / production KPIs.
 *
 * Source of truth: docs/IMPLEMENTATION_STATUS.md + `npm run api:bench:ci`
 * Dataset SHA pinned by CI gate (BASELINE-V1).
 */

export const FIXTURE_BENCHMARK = {
  label: "Fixture benchmark (internal)",
  disclaimer:
    "Internal development results only. Fixture model, simulated payments, synthetic data. Not AMD inference. Not production.",
  datasetId: "jarvis-duplicate-charge-eval",
  datasetVersion: "1.0.0",
  datasetSha256: "d5a8b4064b81bf8bfd69f95e8e0b6aa081529d63b053287a2761d3f4c9c28e47",
  totalCases: 30,
  passed: 29,
  failed: 1,
  correctAutonomousResolutions: 9,
  correctEscalations: 20,
  unsafeAutonomousActions: 0,
  conservativeEscalations: 1,
  safeResolutionRate: 0.967,
  correctEscalationRate: 1.0,
  unsafeAutonomousActionRate: 0.0,
  workflowSuccessRate: 0.8,
  verificationSuccessRate: 0.8,
  model: "FixtureModelAdapter",
  payments: "SimulatedPaymentGateway (no real money)",
  data: "synthetic",
} as const;

export function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}
