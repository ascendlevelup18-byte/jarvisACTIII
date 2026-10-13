import { StateBadge } from "../components/ui/StateBadge.tsx";
import { explainDecision } from "../lib/proof.ts";
import type { SessionCaseEntry } from "../lib/session-store.ts";

/** Cases JARVIS routed to a human (escalated or failed), with the engine's recorded reasons. */
export function ApprovalsPage({ history, onOpenCase }: { history: SessionCaseEntry[]; onOpenCase: (e: SessionCaseEntry) => void }) {
  const queue = history.filter((h) => h.state === "ESCALATED" || h.state === "FAILED");
  return (
    <div className="motion-fade-in space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Approvals and escalations</h2>
        <p className="mt-1 text-sm text-[var(--color-jarvis-muted)]">
          Cases JARVIS refused to act on alone in this session. No money moved on any of them; each needs a human decision.
          Approving from here is not built — review only.
        </p>
      </header>
      {queue.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-jarvis-border)] px-4 py-10 text-center text-sm text-[var(--color-jarvis-muted)]">
          Nothing waiting. Escalations appear here when JARVIS refuses an unsafe or unclear request — try order #48294 in the demo store.
        </p>
      ) : (
        <ul className="space-y-2">
          {queue.map((entry) => {
            const why = explainDecision(entry.caseData);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onOpenCase(entry)}
                  className="w-full rounded-md border border-[var(--color-warning)]/40 bg-[#1c1810] px-4 py-3 text-left hover:border-[var(--color-warning)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StateBadge state={entry.state} />
                    <span className="text-sm font-medium text-[var(--color-jarvis-ink)]">{entry.scenarioTitle ?? `Order #${entry.orderId}`}</span>
                    <span className="text-[10px] uppercase tracking-wide text-[var(--color-jarvis-faint)]">
                      {entry.source === "storefront" ? "from demo store" : "from operations"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-jarvis-ink)]/85">{why.points[0] ?? "See investigation"}</p>
                  <p className="mt-1 text-[11px] text-[var(--color-jarvis-faint)]">Open investigation →</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
