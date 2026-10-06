import type { ReactNode } from "react";
import { NAV_ITEMS, SYSTEM_TRUTH, type NavId } from "../../lib/system-truth.ts";

export function OpsShell({
  activeNav,
  onNavigate,
  children,
}: {
  activeNav: NavId;
  onNavigate: (id: NavId) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--color-jarvis-surface)] focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>
      <header className="border-b border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-bg-elevated)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--color-jarvis-faint)]">
              Autonomous commerce operations
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--color-jarvis-ink)] sm:text-2xl">JARVIS</h1>
          </div>
          <div
            className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide"
            role="status"
            aria-label="System status"
          >
            <StatusChip tone="success" pulse>
              SYSTEM ONLINE
            </StatusChip>
            <StatusChip tone="ai">{SYSTEM_TRUTH.aiModeLabel}</StatusChip>
            <StatusChip tone="warn">{SYSTEM_TRUTH.gatewayLabel}</StatusChip>
          </div>
        </div>
        <nav
          className="mx-auto max-w-[1600px] px-4 sm:px-6"
          aria-label="Primary"
        >
          <ul className="flex gap-1 overflow-x-auto pb-px">
            {NAV_ITEMS.map((item) => {
              const active = activeNav === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onNavigate(item.id)}
                    className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "text-[var(--color-jarvis-ink)]"
                        : "text-[var(--color-jarvis-muted)] hover:text-[var(--color-jarvis-ink)]"
                    }`}
                  >
                    {item.label}
                    {active && (
                      <span
                        className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--color-policy-accent)]"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-[var(--color-jarvis-border)] px-4 py-3 text-center text-[10px] text-[var(--color-jarvis-faint)] sm:px-6">
        AI proposes → Policy authorizes → Execution (simulated) → Verification · AMD not connected · Evolus not connected
      </footer>
    </div>
  );
}

function StatusChip({
  children,
  tone,
  pulse,
}: {
  children: ReactNode;
  tone: "success" | "ai" | "warn";
  pulse?: boolean;
}) {
  const toneCls =
    tone === "success"
      ? "border-[var(--color-policy-border)] text-[var(--color-policy-accent)]"
      : tone === "ai"
        ? "border-[var(--color-ai-border)] text-[var(--color-ai-accent)]"
        : "border-[var(--color-warning)]/40 text-[var(--color-warning)]";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 ${toneCls}`}>
      {pulse && (
        <span className="motion-audit-pulse h-1.5 w-1.5 rounded-full bg-[var(--color-policy-accent)]" aria-hidden />
      )}
      {children}
    </span>
  );
}
