import { useMemo, useState } from "react";
import { FIXTURE_BENCHMARK, pct } from "../lib/bench-metrics.ts";
import { FixtureBenchmarkNotice } from "../components/ui/FixtureBenchmarkNotice.tsx";
import { Card, EmptyState, KpiCard, PageHeader, Pill, Segmented } from "../components/ui/Primitives.tsx";
import { btn } from "../components/ui/styles.ts";
import { StateBadge } from "../components/ui/StateBadge.tsx";
import {
  deriveAnalytics,
  filterHistory,
  RANGE_LABELS,
  type OutcomeBucket,
  type RangeFilter,
  type SourceFilter,
  type VolumeBucket,
} from "../lib/commerce.ts";
import { formatMinor } from "../lib/money.ts";
import type { SessionCaseEntry } from "../lib/session-store.ts";

const OUTCOME_META: Record<OutcomeBucket, { label: string; color: string }> = {
  resolved: { label: "Resolved (verified)", color: "var(--color-policy-accent)" },
  escalated: { label: "Escalated to a human", color: "var(--color-warning)" },
  closed: { label: "Closed, no action", color: "var(--color-jarvis-border-strong)" },
  failed: { label: "Failed safely", color: "var(--color-danger)" },
};
const OUTCOMES: OutcomeBucket[] = ["resolved", "escalated", "closed", "failed"];

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "storefront", label: "Demo store" },
  { value: "operations", label: "Console" },
];

export function BenchmarksPage({
  history = [],
  onOpenCase,
  onOpenStore,
}: {
  history?: SessionCaseEntry[];
  onOpenCase?: (e: SessionCaseEntry) => void;
  onOpenStore?: () => void;
}) {
  const [source, setSource] = useState<SourceFilter>("all");
  const [range, setRange] = useState<RangeFilter>("session");
  // The range is anchored when the page opens or a filter changes, not on every render.
  const [now, setNow] = useState(() => Date.now());
  const entries = useMemo(() => filterHistory(history, source, range, new Date(now)), [history, source, range, now]);
  const a = useMemo(() => deriveAnalytics(entries), [entries]);
  const fromStore = entries.filter((h) => h.source === "storefront").length;
  const refunded = Object.entries(a.verifiedRefundMinor);
  const b = FIXTURE_BENCHMARK;

  return (
    <div className="motion-fade-in space-y-5">
      <PageHeader
        title="Analytics"
        description="Computed from the cases this session sent to the backend and the pinned safety benchmark. Store data is synthetic and payments are simulated; no revenue, ROI or customer figures are shown because none are measured."
        actions={
          <>
            <Segmented
              label="Source"
              value={source}
              options={SOURCE_OPTIONS}
              onChange={(v) => {
                setSource(v);
                setNow(Date.now());
              }}
            />
            <label className="sr-only" htmlFor="analytics-range">
              Date range
            </label>
            <select
              id="analytics-range"
              value={range}
              onChange={(e) => {
                setRange(e.target.value as RangeFilter);
                setNow(Date.now());
              }}
              className="rounded-md border border-[var(--color-jarvis-border-strong)] bg-[var(--color-jarvis-surface)] px-2 py-1.5 text-xs font-medium text-[var(--color-jarvis-ink)]"
            >
              {(Object.keys(RANGE_LABELS) as RangeFilter[]).map((r) => (
                <option key={r} value={r}>
                  {RANGE_LABELS[r]}
                </option>
              ))}
            </select>
          </>
        }
      />

      <section aria-label="Session metrics">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <KpiCard label="Cases" value={String(a.total)} hint={RANGE_LABELS[range]} />
          <KpiCard label="Resolved (verified)" value={String(a.outcomes.resolved)} />
          <KpiCard label="Escalated to a human" value={String(a.outcomes.escalated)} />
          <KpiCard label="Closed, no action" value={String(a.outcomes.closed)} />
          <KpiCard label="Failed safely" value={String(a.outcomes.failed)} />
          <KpiCard label="From demo store" value={String(fromStore)} />
          <KpiCard
            label="Refunds verified"
            value={refunded.length ? refunded.map(([cur, m]) => formatMinor(m, cur)).join(" · ") : "$0.00"}
            hint="Simulated gateway"
          />
          <KpiCard
            label="Closed autonomously"
            value={a.autonomousRate === null ? "—" : pct(a.autonomousRate)}
            hint="Resolved + no-action"
          />
        </dl>
      </section>

      {a.total === 0 ? (
        <EmptyState
          title={history.length ? "No cases match these filters" : "No cases in this session yet"}
          body={
            history.length
              ? "Widen the date range or source to see the cases sent this session."
              : "Charts fill in from real cases only. Send a refund request from the demo store or run a scenario from Overview."
          }
          action={
            onOpenStore && !history.length ? (
              <button type="button" className={btn.primary} onClick={onOpenStore}>
                Open demo store
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card title="Case volume over time" aside={`${a.bucketMinutes}-minute buckets · by case completion time`}>
              <VolumeChart buckets={a.volume} />
            </Card>
            <Card title="Resolved vs escalated">
              <OutcomeBars outcomes={a.outcomes} total={a.total} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Refund execution" aside="Simulated gateway · read-back verified">
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat label="Executions attempted" value={a.execution.attempted} />
                <Stat label="Verified by read-back" value={a.execution.verified} />
                <Stat label="Not verified" value={a.execution.unverified} />
                <Stat label="AI refund proposals blocked by policy" value={a.proposalsBlocked} />
              </dl>
              <p className="mt-3 text-xs text-[var(--color-jarvis-muted)]">
                A refund counts as executed only when the engine called the gateway, and as verified only when the read-back
                observed it.
              </p>
            </Card>
            <Card title="AI provider calls" aside="From each case's audit trail">
              {a.aiCalls.length === 0 ? (
                <p className="text-sm text-[var(--color-jarvis-muted)]">No AI calls recorded in this range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">AI calls by stage and adapter</caption>
                    <thead className="text-xs text-[var(--color-jarvis-muted)]">
                      <tr>
                        <th className="py-1 pr-3 font-medium">Stage</th>
                        <th className="py-1 pr-3 font-medium">Adapter</th>
                        <th className="py-1 pr-3 text-right font-medium">Calls</th>
                        <th className="py-1 pr-3 text-right font-medium">Avg</th>
                        <th className="py-1 pr-3 text-right font-medium">Max</th>
                        <th className="py-1 text-right font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-jarvis-border)] tabular-nums">
                      {a.aiCalls.map((s) => (
                        <tr key={`${s.stage}-${s.adapter}`}>
                          <td className="py-1.5 pr-3">{s.stage}</td>
                          <td className="py-1.5 pr-3 font-mono text-xs">{s.adapter}</td>
                          <td className="py-1.5 pr-3 text-right">{s.calls}</td>
                          <td className="py-1.5 pr-3 text-right">{s.avgMs} ms</td>
                          <td className="py-1.5 pr-3 text-right">{s.maxMs} ms</td>
                          <td className="py-1.5 text-right">{s.errors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {a.aiCalls.some((s) => s.adapter.startsWith("fixture")) && (
                <p className="mt-3 text-xs text-[var(--color-jarvis-muted)]">
                  Fixture adapters run in-process, so their latency is not model inference time.
                </p>
              )}
            </Card>
          </div>

          <Card title="Recent activity">
            <ul className="divide-y divide-[var(--color-jarvis-border)]">
              {a.activity.map((item) => {
                const entry = entries.find((e) => e.id === item.caseId);
                return (
                  <li key={item.caseId} className="flex flex-wrap items-center gap-3 py-2">
                    <StateBadge state={item.state} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--color-jarvis-ink)]">
                        Order #{item.orderId} · {item.summary}
                      </p>
                      <p className="text-xs text-[var(--color-jarvis-faint)]">
                        {new Date(item.at).toLocaleTimeString()} · {item.source === "storefront" ? "Demo store" : "Console"} ·{" "}
                        <span className="font-mono">{item.caseId}</span>
                      </p>
                    </div>
                    {entry && onOpenCase && (
                      <button type="button" className={btn.ghost} onClick={() => onOpenCase(entry)}>
                        Open case
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      <section aria-labelledby="bench-title" className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id="bench-title" className="text-base font-semibold text-[var(--color-jarvis-ink)]">
            Safety benchmark
          </h3>
          <Pill tone="warning">Fixture model · not AMD · not real-model</Pill>
        </div>
        <FixtureBenchmarkNotice />
        <p className="max-w-3xl text-sm text-[var(--color-warning)]">{b.disclaimer}</p>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="Unsafe autonomous actions" value={String(b.unsafeAutonomousActions)} hint="CI gate: must stay 0" />
          <KpiCard label="Safe resolution rate" value={pct(b.safeResolutionRate)} hint={`${b.passed}/${b.totalCases} cases`} />
          <KpiCard label="Correct escalations" value={`${b.correctEscalations} / ${b.groundTruthEscalation}`} hint={pct(b.correctEscalationRate)} />
          <KpiCard
            label="Correct autonomous"
            value={`${b.correctAutonomousResolutions} / ${b.groundTruthAutonomous}`}
            hint="DC-S04 escalated conservatively"
          />
          <KpiCard label="Conservative escalations" value={String(b.conservativeEscalations)} hint="Safe, but a miss" />
          <KpiCard label="Workflow success" value={pct(b.workflowSuccessRate)} />
          <KpiCard label="Verification success" value={pct(b.verificationSuccessRate)} />
          <KpiCard label="Total cases" value={String(b.totalCases)} />
        </dl>
        <Card title="Dataset pin">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-[var(--color-jarvis-muted)]">Dataset</dt>
              <dd className="font-mono text-xs">
                {b.datasetId} v{b.datasetVersion}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-jarvis-muted)]">SHA-256</dt>
              <dd className="break-all font-mono text-[11px]">{b.datasetSha256}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--color-jarvis-muted)]">Model / payments / data</dt>
              <dd className="text-xs text-[var(--color-jarvis-muted)]">
                {b.model} · {b.payments} · {b.data}
              </dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-jarvis-muted)]">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Legend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-jarvis-muted)]">
      {OUTCOMES.map((o) => (
        <li key={o} className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: OUTCOME_META[o].color }} />
          {OUTCOME_META[o].label}
        </li>
      ))}
    </ul>
  );
}

/** Stacked bars per time bucket. Each bar also carries a text summary for screen readers. */
function VolumeChart({ buckets }: { buckets: VolumeBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.resolved + b.escalated + b.closed + b.failed));
  const shown = buckets.slice(-24);
  return (
    <figure>
      <div className="flex h-44 items-end gap-1.5 border-b border-l border-[var(--color-jarvis-border)] pl-1">
        {shown.map((b) => {
          const total = b.resolved + b.escalated + b.closed + b.failed;
          const time = new Date(b.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <div
              key={b.start}
              role="img"
              aria-label={`${time}: ${total} cases — ${b.resolved} resolved, ${b.escalated} escalated, ${b.closed} closed, ${b.failed} failed`}
              title={`${time} · ${total} cases`}
              className="flex h-full min-w-3 max-w-12 flex-1 flex-col-reverse"
            >
              {OUTCOMES.map((o) =>
                b[o] ? (
                  <div key={o} style={{ height: `${(b[o] / max) * 100}%`, background: OUTCOME_META[o].color }} />
                ) : null,
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-[var(--color-jarvis-faint)]">
        <span>{new Date(shown[0].start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <span>Peak {max} per bucket</span>
        <span>{new Date(shown[shown.length - 1].start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <Legend />
    </figure>
  );
}

function OutcomeBars({ outcomes, total }: { outcomes: Record<OutcomeBucket, number>; total: number }) {
  return (
    <ul className="space-y-3">
      {OUTCOMES.map((o) => {
        const share = total ? outcomes[o] / total : 0;
        return (
          <li key={o}>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-jarvis-ink)]">{OUTCOME_META[o].label}</span>
              <span className="tabular-nums text-[var(--color-jarvis-muted)]">
                {outcomes[o]} · {pct(share)}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-[var(--color-jarvis-surface-2)]" aria-hidden>
              <div className="h-2 rounded-full" style={{ width: `${share * 100}%`, background: OUTCOME_META[o].color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
