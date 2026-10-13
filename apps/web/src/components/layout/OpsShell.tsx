import type { ReactNode } from "react";
import { NAV_ITEMS, type NavId } from "../../lib/system-truth.ts";
import { RuntimeChips } from "../ui/RuntimeChips.tsx";

export function OpsShell({
  activeNav,
  onNavigate,
  actions,
  children,
}: {
  activeNav: NavId;
  onNavigate: (id: NavId) => void;
  /** Header actions (e.g. open the demo store, re-run setup). */
  actions?: ReactNode;
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
              Merchant command center
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--color-jarvis-ink)] sm:text-2xl">JARVIS Automations</h1>
          </div>
          <RuntimeChips />
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
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
        AI proposes → Policy authorizes → Execution (simulated) → Verification · status chips come from /api/health
      </footer>
    </div>
  );
}
