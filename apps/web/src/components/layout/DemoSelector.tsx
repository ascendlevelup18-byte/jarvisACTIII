import { useState } from "react";
import { DEMO_SCENARIOS, type DemoScenario } from "../../fixtures/demo-scenarios.ts";
import type { CaseRequest } from "../../lib/case-types.ts";

export function DemoSelector({
  loading,
  activeId,
  onRunDemo,
  onCustomSubmit,
  custom,
  onCustomChange,
}: {
  loading: boolean;
  activeId?: string;
  onRunDemo: (scenario: DemoScenario) => void;
  onCustomSubmit: () => void;
  custom: CaseRequest;
  onCustomChange: (next: CaseRequest) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--color-jarvis-border)] bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-jarvis-muted)]">
          Demos
        </span>
        <div className="inline-flex flex-wrap overflow-hidden rounded-md border border-[var(--color-jarvis-border)]">
          {DEMO_SCENARIOS.map((s, i) => {
            const active = activeId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={loading}
                title={s.description}
                onClick={() => onRunDemo(s)}
                className={`px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                  i > 0 ? "border-l border-[var(--color-jarvis-border)]" : ""
                } ${
                  active
                    ? "bg-[var(--color-jarvis-ink)] text-white"
                    : "bg-[var(--color-jarvis-bg)] text-[var(--color-jarvis-ink)] hover:bg-white"
                }`}
              >
                {shortLabel(s.id)}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="ml-auto text-xs text-[var(--color-jarvis-muted)] underline-offset-2 hover:underline"
          onClick={() => setCustomOpen((v) => !v)}
        >
          {customOpen ? "Hide custom" : "Custom case"}
        </button>
      </div>

      {customOpen && (
        <form
          className="mt-2.5 grid gap-2 border-t border-[var(--color-jarvis-border)] pt-2.5 sm:grid-cols-[1fr_1fr_2fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            onCustomSubmit();
          }}
        >
          <input
            className="rounded border border-[var(--color-jarvis-border)] px-2.5 py-1.5 font-mono text-sm"
            placeholder="CUST-1001"
            value={custom.customerId}
            onChange={(e) => onCustomChange({ ...custom, customerId: e.target.value })}
          />
          <input
            className="rounded border border-[var(--color-jarvis-border)] px-2.5 py-1.5 font-mono text-sm"
            placeholder="48291"
            value={custom.orderId}
            onChange={(e) => onCustomChange({ ...custom, orderId: e.target.value })}
          />
          <input
            className="rounded border border-[var(--color-jarvis-border)] px-2.5 py-1.5 text-sm"
            placeholder="Customer message…"
            value={custom.message}
            onChange={(e) => onCustomChange({ ...custom, message: e.target.value })}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-[var(--color-jarvis-ink)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}

function shortLabel(id: string): string {
  switch (id) {
    case "valid-duplicate":
      return "Valid duplicate";
    case "conflicting-amount":
      return "Conflict";
    case "already-refunded":
      return "Already refunded";
    case "prompt-injection":
      return "Adversarial message";
    default:
      return id;
  }
}
