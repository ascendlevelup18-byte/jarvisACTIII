// Navigation for the merchant command center. Runtime status labels come from
// /api/health (see runtime-truth.ts).

export type NavId =
  | "operations"
  | "orders"
  | "inbox"
  | "automations"
  | "cases"
  | "approvals"
  | "benchmarks"
  | "activity"
  | "system";

export interface NavItem {
  id: NavId;
  label: string;
  section: "Commerce" | "Automation" | "Insights" | "Settings";
}

export const NAV_ITEMS: NavItem[] = [
  { id: "operations", label: "Overview", section: "Commerce" },
  { id: "orders", label: "Orders", section: "Commerce" },
  { id: "inbox", label: "Inbox", section: "Commerce" },
  { id: "cases", label: "Cases", section: "Automation" },
  { id: "approvals", label: "Approvals", section: "Automation" },
  { id: "automations", label: "Automations", section: "Automation" },
  { id: "benchmarks", label: "Analytics", section: "Insights" },
  { id: "activity", label: "Audit trail", section: "Insights" },
  { id: "system", label: "AI provider", section: "Settings" },
];

export const NAV_SECTIONS = ["Commerce", "Automation", "Insights", "Settings"] as const;
