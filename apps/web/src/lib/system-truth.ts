// Navigation. Runtime status labels come from /api/health (see runtime-truth.ts).

export type NavId = "operations" | "cases" | "activity" | "benchmarks" | "system";

export const NAV_ITEMS: Array<{ id: NavId; label: string; deep: boolean }> = [
  { id: "operations", label: "Operations", deep: true },
  { id: "cases", label: "Cases", deep: true },
  { id: "activity", label: "Activity", deep: false },
  { id: "benchmarks", label: "Benchmarks", deep: false },
  { id: "system", label: "System", deep: false },
];
