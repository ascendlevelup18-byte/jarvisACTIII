/** Truthful system status — fixture / simulated only. No fake production connectivity. */

export const SYSTEM_TRUTH = {
  systemOnline: true,
  aiMode: "FIXTURE" as const,
  aiModeLabel: "AI MODE FIXTURE",
  gateway: "SIMULATED" as const,
  gatewayLabel: "GATEWAY SIMULATED",
  amdConnected: false,
  evolusConnected: false,
  productionPayment: false,
  modelAdapter: "FixtureModelAdapter",
  paymentGateway: "SimulatedPaymentGateway",
  data: "synthetic fixture data",
  notes: [
    "AMD / vLLM is NOT connected in this build.",
    "Evolus is NOT connected in this build.",
    "Payment gateway is simulated — no real money moves.",
    "AI proposals have no execution authority; policy authorizes.",
  ],
} as const;

export type NavId = "operations" | "cases" | "activity" | "benchmarks" | "system";

export const NAV_ITEMS: Array<{ id: NavId; label: string; deep: boolean }> = [
  { id: "operations", label: "Operations", deep: true },
  { id: "cases", label: "Cases", deep: true },
  { id: "activity", label: "Activity", deep: false },
  { id: "benchmarks", label: "Benchmarks", deep: false },
  { id: "system", label: "System", deep: false },
];
