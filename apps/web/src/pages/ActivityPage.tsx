import type { SessionCaseEntry } from "../lib/session-store.ts";
import { StateBadge } from "../components/ui/StateBadge.tsx";

export function ActivityPage({ history, onOpenCase }: { history: SessionCaseEntry[]; onOpenCase: (e: SessionCaseEntry) => void }) {
  return (
    <div className="motion-fade-in space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Activity</h2>
        <p className="mt-1 text-sm text-[var(--color-jarvis-muted)]">
          Session activity only — chronological list of cases submitted in this browser session. No fabricated
          production event feed.
        </p>
      </header>
      {history.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-jarvis-border)] px-4 py-10 text-center text-sm text-[var(--color-jarvis-muted)]">
          No activity yet. Run a demo from Operations.
        </p>
      ) : (
        <ol className="space-y-2">
          {history.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onOpenCase(entry)}
                className="flex w-full items-start gap-3 rounded-md border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)] px-4 py-3 text-left hover:bg-[var(--color-jarvis-surface-2)]"
              >
                <span className="font-mono text-[10px] text-[var(--color-jarvis-faint)]">{entry.submittedAt}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StateBadge state={entry.state} />
                    <span className="text-sm font-medium">{entry.scenarioTitle ?? entry.id}</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-[var(--color-jarvis-muted)]">
                    {entry.customerId} · order #{entry.orderId} · audit events{" "}
                    {entry.caseData.audit.length}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
