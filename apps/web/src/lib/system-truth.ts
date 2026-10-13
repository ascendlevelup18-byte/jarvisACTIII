// Navigation for the merchant command center. Runtime status labels come from
// /api/health (see runtime-truth.ts).

export type NavId = "operations" | "automations" | "cases" | "approvals" | "benchmarks" | "activity" | "system";

export const NAV_ITEMS: Array<{ id: NavId; label: string; deep: boolean }> = [
  { id: "operations", label: "Overview", deep: true },
  { id: "automations", label: "Automations", deep: false },
  { id: "cases", label: "Cases", deep: true },
  { id: "approvals", label: "Approvals", deep: false },
  { id: "benchmarks", label: "Analytics", deep: false },
  { id: "activity", label: "Audit trail", deep: false },
  { id: "system", label: "AI provider", deep: false },
];
