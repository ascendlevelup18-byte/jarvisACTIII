import { useEffect, useState } from "react";
import { SYSTEM_TRUTH } from "../lib/system-truth.ts";
import { FIXTURE_BENCHMARK } from "../lib/bench-metrics.ts";
import { Panel, TrustBadge } from "../components/ui/Panel.tsx";

interface HealthPayload {
  ok?: boolean;
  deployment?: string;
  aiMode?: string;
  data?: string;
  paymentGateway?: string;
  remoteModel?: boolean;
  note?: string;
}

export function SystemPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<HealthPayload>;
      })
      .then((body) => {
        if (!cancelled) setHealth(body);
      })
      .catch((e) => {
        if (!cancelled) {
          setHealth(null);
          setHealthError(e instanceof Error ? e.message : "Health endpoint unavailable (local API may not expose it)");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="motion-fade-in space-y-4">
      <header>
        <h2 className="text-xl font-semibold">System</h2>
        <p className="mt-1 text-sm text-[var(--color-jarvis-muted)]">
          Deployment and capability truth. Nothing here invents AMD, Evolus, or production payments.
        </p>
      </header>

      <Panel id="system-truth" title="System truth" badge={<TrustBadge kind="authoritative" />} variant="muted">
        <ul className="space-y-2 text-sm">
          <TruthRow label="System" value={SYSTEM_TRUTH.systemOnline ? "ONLINE" : "OFFLINE"} ok />
          <TruthRow label="AI mode" value={SYSTEM_TRUTH.aiModeLabel} />
          <TruthRow label="Model adapter" value={SYSTEM_TRUTH.modelAdapter} />
          <TruthRow label="Payment gateway" value={`${SYSTEM_TRUTH.paymentGateway} · ${SYSTEM_TRUTH.gatewayLabel}`} warn />
          <TruthRow label="Data" value={SYSTEM_TRUTH.data} />
          <TruthRow label="AMD / vLLM" value="NOT CONNECTED" warn />
          <TruthRow label="Evolus" value="NOT CONNECTED" warn />
          <TruthRow label="Production payment" value="NOT ENABLED" warn />
          <TruthRow
            label="Dataset SHA"
            value={FIXTURE_BENCHMARK.datasetSha256.slice(0, 16) + "…"}
            mono
          />
        </ul>
        <ul className="mt-4 list-inside list-disc text-xs text-[var(--color-jarvis-muted)]">
          {SYSTEM_TRUTH.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </Panel>

      <Panel title="Health probe" variant="muted">
        {health ? (
          <pre className="overflow-x-auto rounded border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-bg)] p-3 font-mono text-[11px] text-[var(--color-jarvis-ink)]">
            {JSON.stringify(health, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-[var(--color-jarvis-muted)]">
            {healthError ?? "Checking /api/health…"}
            <span className="mt-2 block text-xs">
              On Netlify this returns fixture deployment truth. Local `api:start` may not expose `/api/health` —
              use the Netlify function or System Truth panel above.
            </span>
          </p>
        )}
      </Panel>
    </div>
  );
}

function TruthRow({
  label,
  value,
  ok,
  warn,
  mono,
}: {
  label: string;
  value: string;
  ok?: boolean;
  warn?: boolean;
  mono?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-jarvis-border)]/60 pb-2 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-[var(--color-jarvis-faint)]">{label}</span>
      <span
        className={`text-sm font-medium ${mono ? "font-mono text-xs" : ""} ${
          ok
            ? "text-[var(--color-policy-accent)]"
            : warn
              ? "text-[var(--color-warning)]"
              : "text-[var(--color-jarvis-ink)]"
        }`}
      >
        {value}
      </span>
    </li>
  );
}
