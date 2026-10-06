import type { Case, CaseState } from "../../lib/case-types.ts";
import { executionStarted, stoppedFromState } from "../../lib/verdict.ts";

const STAGES = [
  { id: "UNDERSTAND", label: "UNDERSTAND", states: ["RECEIVED", "EXTRACTING"] as CaseState[] },
  { id: "EVIDENCE", label: "EVIDENCE", states: ["EVIDENCE_GATHERING"] as CaseState[] },
  { id: "PROPOSE", label: "PROPOSE", states: ["ANALYZING", "DECISION_PROPOSED"] as CaseState[] },
  { id: "AUTHORIZE", label: "AUTHORIZE", states: ["POLICY_VALIDATION", "APPROVED"] as CaseState[] },
  { id: "ACT", label: "ACT", states: ["EXECUTING"] as CaseState[] },
  { id: "VERIFY", label: "VERIFY", states: ["VERIFYING", "RESOLVED"] as CaseState[] },
] as const;

type StageId = (typeof STAGES)[number]["id"];

function visitedStates(caseData: Case): Set<CaseState> {
  const seen = new Set<CaseState>();
  for (const ev of caseData.audit) {
    if (ev.type === "STATE_TRANSITION" && ev.to) seen.add(ev.to as CaseState);
  }
  seen.add(caseData.state);
  return seen;
}

function stageReached(visited: Set<CaseState>, stageStates: readonly CaseState[]): boolean {
  return stageStates.some((s) => visited.has(s));
}

function stageForState(state: CaseState | null): StageId | null {
  if (!state) return null;
  for (const stage of STAGES) {
    if (stage.states.includes(state)) return stage.id;
  }
  return null;
}

function footerText(caseData: Case, stoppedStage: StageId | null): string | null {
  const { state, authorization, reasons } = caseData;
  if (state === "CLOSED_NO_ACTION") {
    return "Stopped at AUTHORIZE — NO_ACTION (success path, not a failure)";
  }
  if (state === "ESCALATED") {
    if (authorization?.outcome === "DENY") return "Stopped at AUTHORIZE — execution never opened";
    if (reasons.some((r) => r.code === "STALE_EVIDENCE")) {
      return "Stopped at AUTHORIZE — pre-execution revalidation failed; execution never opened";
    }
    return "Stopped at EVIDENCE — escalated before any proposal";
  }
  if (state === "FAILED") {
    if (!executionStarted(caseData)) {
      const code = reasons[0]?.code ?? "UNKNOWN";
      return `Stopped at ${stoppedStage ?? "UNKNOWN"} — ${code}; execution never opened`;
    }
    return "Execution attempted — read-back did not confirm the refund";
  }
  return null;
}

export function OperationalFlow({ caseData }: { caseData: Case }) {
  const visited = visitedStates(caseData);
  const finalState = caseData.state;
  const blocked = finalState === "ESCALATED" || finalState === "FAILED";
  const closed = finalState === "CLOSED_NO_ACTION";
  const resolved = finalState === "RESOLVED";

  const stopped = stoppedFromState(caseData);
  let stoppedStage = stageForState(stopped);

  if (closed) stoppedStage = "AUTHORIZE";
  if (finalState === "ESCALATED" && caseData.authorization?.outcome === "DENY") stoppedStage = "AUTHORIZE";
  if (finalState === "ESCALATED" && caseData.reasons.some((r) => r.code === "STALE_EVIDENCE")) {
    stoppedStage = "AUTHORIZE";
  }
  if (
    finalState === "ESCALATED" &&
    caseData.authorization == null &&
    !caseData.reasons.some((r) => r.code === "STALE_EVIDENCE")
  ) {
    stoppedStage = "EVIDENCE";
  }
  if (finalState === "FAILED" && executionStarted(caseData)) stoppedStage = "VERIFY";

  const stoppedIdx = stoppedStage ? STAGES.findIndex((s) => s.id === stoppedStage) : -1;
  const footer = footerText(caseData, stoppedStage);

  return (
    <div className="rounded-md border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)] px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-jarvis-faint)]">
          Decision path
        </h3>
        <span className="text-[10px] text-[var(--color-jarvis-muted)]">Derived from audit · not a live stream</span>
      </div>
      <ol className="flex flex-wrap items-center gap-1.5">
        {STAGES.map((stage, idx) => {
          let hit = stageReached(visited, stage.states);
          if (stage.id === "AUTHORIZE" && closed) hit = true;
          if (stage.id === "VERIFY" && resolved) hit = true;
          if (stoppedIdx >= 0 && idx > stoppedIdx) hit = false;
          if (stoppedIdx >= 0 && idx === stoppedIdx) hit = true;
          if ((stage.id === "ACT" || stage.id === "VERIFY") && (blocked || closed) && !visited.has("EXECUTING")) {
            hit = false;
          }
          if (stage.id === "VERIFY" && finalState === "FAILED" && executionStarted(caseData)) hit = true;

          const isStop = stoppedIdx >= 0 && idx === stoppedIdx && (blocked || closed);
          let cls = "border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-bg)] text-[var(--color-jarvis-faint)]";
          if (hit && !isStop) {
            cls = "border-[var(--color-jarvis-border-strong)] bg-[var(--color-jarvis-surface-2)] text-[var(--color-jarvis-ink)]";
          }
          if (isStop && blocked) {
            cls = "border-[var(--color-warning)]/50 bg-[#1c1810] font-semibold text-[var(--color-warning)]";
          }
          if (isStop && closed) {
            cls =
              "border-[var(--color-jarvis-border-strong)] bg-[var(--color-jarvis-surface-2)] font-semibold text-[var(--color-jarvis-ink)]";
          }
          if (hit && stage.id === "VERIFY" && resolved) {
            cls =
              "border-[var(--color-policy-border)] bg-[var(--color-policy-surface)] font-semibold text-[var(--color-policy-accent)]";
          }

          return (
            <li key={stage.id} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-[var(--color-jarvis-faint)]">→</span>}
              <span className={`rounded border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${cls}`}>
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
      {footer && (
        <p
          className={`mt-2 text-xs font-medium ${
            closed ? "text-[var(--color-jarvis-muted)]" : blocked ? "text-[var(--color-warning)]" : "text-[var(--color-jarvis-muted)]"
          }`}
        >
          {footer}
        </p>
      )}
    </div>
  );
}
