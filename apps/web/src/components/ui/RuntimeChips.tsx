import { deriveRuntimeTruth, type TruthTone } from "../../lib/runtime-truth.ts";
import { useRuntimeHealth } from "../../lib/use-runtime-health.ts";

const TONE: Record<TruthTone, string> = {
  ok: "border-[var(--color-policy-border)] text-[var(--color-policy-accent)]",
  info: "border-[var(--color-ai-border)] text-[var(--color-ai-accent)]",
  warn: "border-[var(--color-warning)]/40 text-[var(--color-warning)]",
  unknown: "border-[var(--color-jarvis-border)] text-[var(--color-jarvis-muted)]",
};

/** Status chips from the backend's own /api/health answer. Never claims AMD hardware or Evolus. */
export function RuntimeChips() {
  const health = useRuntimeHealth();
  const t = deriveRuntimeTruth(health ?? null);
  const api =
    health === undefined
      ? { text: "API · CHECKING", tone: "unknown" as const }
      : health === null
        ? { text: "API HEALTH UNAVAILABLE", tone: "unknown" as const }
        : health.ok === false
          ? { text: "API DEGRADED", tone: "warn" as const }
          : { text: "API ONLINE", tone: "ok" as const };
  const chips = [
    { text: api.text, tone: api.tone, title: "From GET /api/health" },
    { text: t.ai.value, tone: t.ai.tone, title: t.ai.detail },
    { text: `PAYMENTS ${t.gateway.value}`, tone: t.gateway.tone, title: t.gateway.detail },
    { text: `AMD HW ${t.amdHardware.value}`, tone: t.amdHardware.tone, title: t.amdHardware.detail },
    { text: `EVOLUS ${t.evolus.value}`, tone: t.evolus.tone, title: t.evolus.detail },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" aria-label="Runtime status">
      {chips.map((c) => (
        <li key={c.text} title={c.title} className={`rounded-full border bg-[var(--color-jarvis-surface)] px-2 py-0.5 ${TONE[c.tone]}`}>
          {c.text}
        </li>
      ))}
    </ul>
  );
}
