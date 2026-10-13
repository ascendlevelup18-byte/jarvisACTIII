import { useMemo, useState } from "react";
import { EmptyState, KpiCard, PageHeader, Pill } from "../components/ui/Primitives.tsx";
import { StateBadge } from "../components/ui/StateBadge.tsx";
import { btn } from "../components/ui/styles.ts";
import { inWindow, rangeWindow, recordFromEntry, summarize } from "../lib/analytics.ts";
import { AUTOMATION_MODULES, type AutomationModule } from "../lib/automations.ts";
import type { DemoStoreSnapshot } from "../lib/demo-store.ts";
import { formatMinor } from "../lib/money.ts";
import { explainDecision } from "../lib/proof.ts";
import type { SessionCaseEntry } from "../lib/session-store.ts";
import type { NavId } from "../lib/system-truth.ts";

/** Merchant landing page: today's recorded activity, what needs a person, and where to go next. */
export function DashboardPage({
  history,
  snapshot,
  modules,
  onNavigate,
  onOpenCase,
  onOpenStore,
}: {
  history: SessionCaseEntry[];
  snapshot: DemoStoreSnapshot | null;
  modules: AutomationModule["id"][];
  onNavigate: (id: NavId) => void;
  onOpenCase: (e: SessionCaseEntry) => void;
  onOpenStore: () => void;
}) {
  const [openedAt] = useState(() => Date.now());
  const today = useMemo(() => {
    const records = history.map(recordFromEntry);
    const w = rangeWindow("today", openedAt, records);
    return summarize(records.filter((r) => inWindow(r, w)));
  }, [history, openedAt]);
  const review = history.filter((h) => h.state === "ESCALATED" || h.state === "FAILED");
  const refunded = Object.entries(today.verifiedRefundMinor);

  return (
    <div className="motion-fade-in space-y-5">
      <PageHeader
        title="Dashboard"
        description={`${snapshot?.store.name ?? "Demo store"} · today's recorded activity and what needs a person. Figures come from cases recorded in this browser.`}
        actions={
          <>
            <button type="button" className={btn.secondary} onClick={() => onNavigate("benchmarks")}>
              View analytics
            </button>
            <button type="button" className={btn.primary} onClick={onOpenStore}>
              Open demo store
            </button>
          </>
        }
      />

      <section aria-label="Today">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Cases today" value={String(today.cases)} hint={`${today.storefront} from the demo store`} />
          <KpiCard label="Resolved (verified)" value={String(today.outcomes.resolved)} />
          <KpiCard label="Pending reviews" value={String(review.length)} hint="All recorded escalations" />
          <KpiCard
            label="Verified simulated refunds today"
            value={refunded.length ? refunded.map(([c, m]) => formatMinor(m, c)).join(" · ") : formatMinor(0, "USD")}
          />
        </dl>
      </section>

      {history.length === 0 ? (
        <EmptyState
          title="Nothing recorded yet"
          body="Run the full journey: request a refund for order #48291 in the demo store (it resolves), then #48294 (it escalates). Or open Proof Mode to compare a safe and an unsafe request side by side."
          action={
            <>
              <button type="button" className={btn.primary} onClick={onOpenStore}>
                Open demo store
              </button>
              <button type="button" className={btn.secondary} onClick={() => onNavigate("operations")}>
                Open Proof Mode
              </button>
            </>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-label="Needs attention" className="rounded-lg border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)] shadow-card">
            <header className="flex items-center justify-between border-b border-[var(--color-jarvis-border)] px-4 py-2.5">
              <h3 className="text-sm font-semibold">Needs attention</h3>
              <button type="button" className={btn.ghost} onClick={() => onNavigate("approvals")}>
                Review queue
              </button>
            </header>
            {review.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[var(--color-jarvis-muted)]">No escalations. Every recorded case finished without a person.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-jarvis-border)]">
                {review.slice(0, 5).map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => onOpenCase(e)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-jarvis-surface-2)]">
                      <StateBadge state={e.state} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">Order #{e.orderId}</span>
                        <span className="block truncate text-xs text-[var(--color-jarvis-muted)]">{explainDecision(e.caseData).points[0]}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-label="Recent cases" className="rounded-lg border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)] shadow-card">
            <header className="flex items-center justify-between border-b border-[var(--color-jarvis-border)] px-4 py-2.5">
              <h3 className="text-sm font-semibold">Recent cases</h3>
              <button type="button" className={btn.ghost} onClick={() => onNavigate("cases")}>
                All cases
              </button>
            </header>
            <ul className="divide-y divide-[var(--color-jarvis-border)]">
              {history.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => onOpenCase(e)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-jarvis-surface-2)]">
                    <StateBadge state={e.state} />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      Order #{e.orderId} · {e.source === "storefront" ? "demo store" : "console"}
                    </span>
                    <span className="text-xs tabular-nums text-[var(--color-jarvis-faint)]">{new Date(e.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section aria-label="Automations" className="rounded-lg border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)] shadow-card">
        <header className="flex items-center justify-between border-b border-[var(--color-jarvis-border)] px-4 py-2.5">
          <h3 className="text-sm font-semibold">Automations</h3>
          <button type="button" className={btn.ghost} onClick={() => onNavigate("automations")}>
            Catalog
          </button>
        </header>
        <ul className="grid gap-px bg-[var(--color-jarvis-border)] sm:grid-cols-2 lg:grid-cols-3">
          {AUTOMATION_MODULES.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 bg-[var(--color-jarvis-surface)] px-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{m.title}</span>
                <span className="block text-[11px] text-[var(--color-jarvis-faint)]">{modules.includes(m.id) ? "Selected in setup" : "Not selected"}</span>
              </span>
              <Pill tone={m.status === "operational" ? "success" : "neutral"}>{m.status === "operational" ? "Live · simulated payments" : "Preview"}</Pill>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
