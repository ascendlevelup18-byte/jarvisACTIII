import type { SessionCaseEntry } from "../lib/session-store.ts";
import { countByState } from "../lib/session-store.ts";
import { StateBadge } from "../components/ui/StateBadge.tsx";
import { DEMO_SCENARIOS, type DemoScenario } from "../fixtures/demo-scenarios.ts";
import { DemoScenariosBar } from "../components/layout/DemoScenariosBar.tsx";

export function CasesPage({
  history,
  loading,
  activeDemoId,
  onRunDemo,
  onOpenCase,
}: {
  history: SessionCaseEntry[];
  loading: boolean;
  activeDemoId?: string;
  onRunDemo: (s: DemoScenario) => void;
  onOpenCase: (entry: SessionCaseEntry) => void;
}) {
  const counts = countByState(history);
  return (
    <div className="motion-fade-in space-y-4">
      <header>
        <h2 className="text-xl font-semibold text-[var(--color-jarvis-ink)]">Cases</h2>
        <p className="mt-1 text-sm text-[var(--color-jarvis-muted)]">
          Session case queue from real API responses. Run a canonical demo or reopen a prior investigation.
        </p>
      </header>
      <DemoScenariosBar loading={loading} activeId={activeDemoId} onRunDemo={onRunDemo} />
      <div className="flex flex-wrap gap-3 text-xs text-[var(--color-jarvis-muted)]">
        <span>RESOLVED {counts.RESOLVED}</span>
        <span>ESCALATED {counts.ESCALATED}</span>
        <span>CLOSED_NO_ACTION {counts.CLOSED_NO_ACTION}</span>
        <span>FAILED {counts.FAILED}</span>
        <span className="text-[var(--color-jarvis-faint)]">· {DEMO_SCENARIOS.length} demos available</span>
      </div>
      {history.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-jarvis-border)] px-4 py-10 text-center text-sm text-[var(--color-jarvis-muted)]">
          No cases yet this session.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-jarvis-border)] overflow-hidden rounded-md border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)]">
          {history.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onOpenCase(entry)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-jarvis-surface-2)]"
              >
                <StateBadge state={entry.state} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.scenarioTitle ?? `Order #${entry.orderId}`}</p>
                  <p className="font-mono text-[11px] text-[var(--color-jarvis-muted)]">
                    {entry.customerId} · #{entry.orderId}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
