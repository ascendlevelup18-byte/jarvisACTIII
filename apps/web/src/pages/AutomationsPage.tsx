import { AUTOMATION_MODULES, type AutomationModule } from "../lib/automations.ts";
import { countByState, type SessionCaseEntry } from "../lib/session-store.ts";

/** Automations the merchant chose, with what genuinely runs. Counts are this session's real cases. */
export function AutomationsPage({
  enabled,
  history,
  onOpenStore,
}: {
  enabled: AutomationModule["id"][];
  history: SessionCaseEntry[];
  onOpenStore: () => void;
}) {
  const counts = countByState(history);
  const fromStore = history.filter((h) => h.source === "storefront").length;
  return (
    <div className="motion-fade-in space-y-4">
      <header>
        <h2 className="text-xl font-semibold">Automations</h2>
        <p className="mt-1 text-sm text-[var(--color-jarvis-muted)]">
          Operational modules run on the JARVIS backend; previews are not built yet and do nothing.
        </p>
      </header>
      <ul className="grid gap-3 md:grid-cols-2">
        {AUTOMATION_MODULES.map((m) => {
          const on = enabled.includes(m.id);
          const live = m.status === "operational";
          return (
            <li
              key={m.id}
              className={`rounded-md border p-4 ${
                live ? "border-[var(--color-policy-border)] bg-[var(--color-policy-surface)]" : "border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)]"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-jarvis-ink)]">{m.title}</h3>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    live ? "bg-[var(--color-policy-accent)]/15 text-[var(--color-policy-accent)]" : "bg-[var(--color-jarvis-surface-2)] text-[var(--color-jarvis-muted)]"
                  }`}
                >
                  {live ? "Operational" : "Preview"}
                </span>
                <span className="text-[10px] text-[var(--color-jarvis-faint)]">{on ? "Selected in setup" : "Not selected"}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-jarvis-ink)]/85">{m.summary}</p>
              <p className="mt-1 text-xs text-[var(--color-jarvis-muted)]">{m.reality}</p>
              {live && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-jarvis-muted)]">
                  <span>
                    This session: {history.length} case{history.length === 1 ? "" : "s"} · {counts.RESOLVED} resolved · {counts.ESCALATED} escalated ·{" "}
                    {counts.CLOSED_NO_ACTION} no action · {counts.FAILED} failed · {fromStore} from the demo store
                  </span>
                  <button type="button" onClick={onOpenStore} className="text-[var(--color-deterministic-accent)] underline-offset-2 hover:underline">
                    Try it from the demo store →
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
