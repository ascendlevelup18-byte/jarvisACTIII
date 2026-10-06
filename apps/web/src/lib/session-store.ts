import type { Case } from "./case-types.ts";

export interface SessionCaseEntry {
  id: string;
  orderId: string;
  customerId: string;
  state: Case["state"];
  scenarioTitle?: string;
  scenarioId?: string;
  submittedAt: string;
  caseData: Case;
}

/** In-memory session history of cases submitted through this UI. */
export function appendSessionCase(
  history: SessionCaseEntry[],
  caseData: Case,
  meta: { scenarioTitle?: string; scenarioId?: string },
): SessionCaseEntry[] {
  const entry: SessionCaseEntry = {
    id: caseData.id,
    orderId: caseData.request.orderId,
    customerId: caseData.request.customerId,
    state: caseData.state,
    scenarioTitle: meta.scenarioTitle,
    scenarioId: meta.scenarioId,
    submittedAt: caseData.updatedAt || caseData.createdAt,
    caseData,
  };
  return [entry, ...history.filter((h) => h.id !== caseData.id)];
}

export function countByState(history: SessionCaseEntry[]): Record<string, number> {
  const counts: Record<string, number> = {
    RESOLVED: 0,
    ESCALATED: 0,
    CLOSED_NO_ACTION: 0,
    FAILED: 0,
    OTHER: 0,
  };
  for (const h of history) {
    if (h.state in counts) counts[h.state] += 1;
    else counts.OTHER += 1;
  }
  return counts;
}
