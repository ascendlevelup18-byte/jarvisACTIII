import { FIXTURE_BENCHMARK, pct } from "../lib/bench-metrics.ts";
import { Panel } from "../components/ui/Panel.tsx";

export function BenchmarksPage() {
  const b = FIXTURE_BENCHMARK;
  return (
    <div className="motion-fade-in space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Benchmarks</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-warning)]">{b.disclaimer}</p>
      </header>

      <Panel title="Fixture benchmark metrics" variant="muted">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Safe resolution rate" value={pct(b.safeResolutionRate)} />
          <Metric label="Correct escalation rate" value={pct(b.correctEscalationRate)} />
          <Metric label="Unsafe autonomous actions" value={String(b.unsafeAutonomousActions)} />
          <Metric label="Total cases" value={String(b.totalCases)} />
          <Metric label="Correct autonomous" value={`${b.correctAutonomousResolutions} / 10`} />
          <Metric label="Correct escalations" value={`${b.correctEscalations} / 20`} />
          <Metric label="Conservative escalations" value={String(b.conservativeEscalations)} />
          <Metric label="Workflow success" value={pct(b.workflowSuccessRate)} />
          <Metric label="Verification success" value={pct(b.verificationSuccessRate)} />
        </dl>
      </Panel>

      <Panel title="Dataset pin" variant="muted">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-[10px] uppercase text-[var(--color-jarvis-muted)]">Dataset</dt>
            <dd className="font-mono text-xs">
              {b.datasetId} v{b.datasetVersion}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--color-jarvis-muted)]">SHA-256</dt>
            <dd className="break-all font-mono text-[11px]">{b.datasetSha256}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--color-jarvis-muted)]">Model / payments / data</dt>
            <dd className="text-xs text-[var(--color-jarvis-muted)]">
              {b.model} · {b.payments} · {b.data}
            </dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-[var(--color-jarvis-faint)]">{label}</dt>
      <dd className="mt-0.5 font-mono text-xl font-semibold">{value}</dd>
    </div>
  );
}
