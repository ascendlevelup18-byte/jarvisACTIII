import type { ReactNode } from "react";
import { FIXTURE_BENCHMARK, pct } from "../../lib/bench-metrics.ts";
import { SYSTEM_TRUTH } from "../../lib/system-truth.ts";
import type { SessionCaseEntry } from "../../lib/session-store.ts";
import { countByState } from "../../lib/session-store.ts";
import { DEMO_SCENARIOS, type DemoScenario } from "../../fixtures/demo-scenarios.ts";
import { DemoScenariosBar } from "../layout/DemoScenariosBar.tsx";
import { FixtureBenchmarkNotice } from "../ui/FixtureBenchmarkNotice.tsx";
import { StateBadge } from "../ui/StateBadge.tsx";

export function CommandCenter({
  history,
  loading,
  activeDemoId,
  error,
  onRunDemo,
  onOpenCase,
}: {
  history: SessionCaseEntry[];
  loading: boolean;
  activeDemoId?: string;
  error: string | null;
  onRunDemo: (s: DemoScenario) => void;
  onOpenCase: (entry: SessionCaseEntry) => void;
}) {
  const counts = countByState(history);

  return (
    <div className="motion-fade-in space-y-5">
      <section
        className="motion-slide-up rounded-md border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)] px-5 py-6 sm:px-8"
        aria-labelledby="ops-hero-title"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-jarvis-faint)]">
          Operations command center
        </p>
        <h2 id="ops-hero-title" className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-[var(--color-jarvis-ink)] sm:text-3xl">
          Investigate commerce exceptions with policy-gated autonomy
        </h2>
        <p className="mt-3 max-w-xl text-sm text-[var(--color-jarvis-muted)]">
          JARVIS proposes; deterministic policy authorizes. Execution is simulated. AMD and Evolus are not connected in
          this build.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
          <HeroChip tone="ok">SYSTEM ONLINE</HeroChip>
          <HeroChip tone="ai">{SYSTEM_TRUTH.aiModeLabel}</HeroChip>
          <HeroChip tone="warn">{SYSTEM_TRUTH.gatewayLabel}</HeroChip>
        </div>
      </section>

      <section
        aria-label="Pre-kickoff fixture benchmark metrics"
        className="motion-slide-up"
        style={{ animationDelay: "40ms" }}
      >
        <FixtureBenchmarkNotice className="mb-3" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Safe resolution rate"
            value={pct(FIXTURE_BENCHMARK.safeResolutionRate)}
            hint={`Fixture bench · ${FIXTURE_BENCHMARK.passed}/${FIXTURE_BENCHMARK.totalCases}`}
          />
          <MetricCard
            label="Correct escalation"
            value={pct(FIXTURE_BENCHMARK.correctEscalationRate)}
            hint={`Fixture bench · ${FIXTURE_BENCHMARK.correctEscalations}/${FIXTURE_BENCHMARK.groundTruthEscalation}`}
          />
          <MetricCard
            label="Unsafe autonomous"
            value={String(FIXTURE_BENCHMARK.unsafeAutonomousActions)}
            hint="CI gate: must stay 0"
          />
          <MetricCard
            label="Session cases · live, not benchmark"
            value={String(history.length)}
            hint={`R ${counts.RESOLVED} · E ${counts.ESCALATED} · C ${counts.CLOSED_NO_ACTION}`}
          />
        </div>
      </section>

      <DemoScenariosBar loading={loading} activeId={activeDemoId} onRunDemo={onRunDemo} />

      {error && (
        <div
          role="alert"
          className="rounded-md border border-[var(--color-danger)]/40 bg-[#1f1416] px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          {error}
        </div>
      )}

      <section aria-labelledby="case-queue-title">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 id="case-queue-title" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-jarvis-faint)]">
            Case queue
          </h3>
          <span className="text-[10px] text-[var(--color-jarvis-muted)]">
            Session history from real API responses · {DEMO_SCENARIOS.length} canonical demos
          </span>
        </div>
        {history.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)]/50 px-6 py-12 text-center">
            <p className="text-sm font-medium text-[var(--color-jarvis-ink)]">No cases in this session yet</p>
            <p className="mt-1 text-xs text-[var(--color-jarvis-muted)]">
              Run a demo scenario to open the investigation workspace
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-jarvis-border)] overflow-hidden rounded-md border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)]">
            {history.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onOpenCase(entry)}
                  className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-jarvis-surface-2)]"
                >
                  <StateBadge state={entry.state} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-jarvis-ink)]">
                      {entry.scenarioTitle ?? `Order #${entry.orderId}`}
                    </p>
                    <p className="font-mono text-[11px] text-[var(--color-jarvis-muted)]">
                      {entry.customerId} · #{entry.orderId} · {entry.id}
                    </p>
                  </div>
                  <span className="text-[11px] text-[var(--color-jarvis-faint)]">Open investigation →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)] px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-jarvis-faint)]">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-[var(--color-jarvis-ink)]">{value}</p>
      <p className="mt-1 text-[10px] text-[var(--color-jarvis-muted)]">{hint}</p>
    </div>
  );
}

function HeroChip({ children, tone }: { children: ReactNode; tone: "ok" | "ai" | "warn" }) {
  const cls =
    tone === "ok"
      ? "border-[var(--color-policy-border)] text-[var(--color-policy-accent)]"
      : tone === "ai"
        ? "border-[var(--color-ai-border)] text-[var(--color-ai-accent)]"
        : "border-[var(--color-warning)]/40 text-[var(--color-warning)]";
  return <span className={`rounded border px-2.5 py-1 ${cls}`}>{children}</span>;
}
