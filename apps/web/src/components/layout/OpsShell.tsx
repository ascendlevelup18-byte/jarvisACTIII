import type { ReactNode } from "react";
import { NAV_ITEMS, NAV_SECTIONS, type NavId } from "../../lib/system-truth.ts";
import { RuntimeChips } from "../ui/RuntimeChips.tsx";

/** Merchant console frame: compact sidebar on desktop, a scrollable nav row on small screens. */
export function OpsShell({
  activeNav,
  onNavigate,
  actions,
  badges,
  children,
}: {
  activeNav: NavId;
  onNavigate: (id: NavId) => void;
  /** Header actions (e.g. open the demo store, re-run setup). */
  actions?: ReactNode;
  /** Optional counts beside nav items (e.g. open inbox conversations). Only real session counts. */
  badges?: Partial<Record<NavId, number>>;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--color-jarvis-surface)] focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>
      <aside className="border-b border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)] lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-2.5 px-4 py-3 lg:px-4 lg:py-4">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-md bg-[var(--color-jarvis-ink)] text-xs font-bold text-white"
          >
            J
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-tight text-[var(--color-jarvis-ink)]">JARVIS Automations</h1>
            <p className="text-[11px] leading-tight text-[var(--color-jarvis-faint)]">Merchant command center</p>
          </div>
        </div>
        <nav aria-label="Primary" className="px-2 pb-2 lg:flex-1 lg:overflow-y-auto lg:pb-4">
          <ul className="flex gap-0.5 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV_SECTIONS.map((section) => (
              <li key={section} className="contents lg:block">
                <p className="hidden px-2 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-jarvis-faint)] lg:block">
                  {section}
                </p>
                <ul className="contents lg:block lg:space-y-0.5">
                  {NAV_ITEMS.filter((i) => i.section === section).map((item) => {
                    const active = activeNav === item.id;
                    const badge = badges?.[item.id];
                    return (
                      <li key={item.id} className="shrink-0">
                        <button
                          type="button"
                          aria-current={active ? "page" : undefined}
                          onClick={() => onNavigate(item.id)}
                          className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                            active
                              ? "bg-[var(--color-deterministic)] font-semibold text-[var(--color-deterministic-accent)]"
                              : "text-[var(--color-jarvis-muted)] hover:bg-[var(--color-jarvis-surface-2)] hover:text-[var(--color-jarvis-ink)]"
                          }`}
                        >
                          {item.label}
                          {badge ? (
                            <span
                              aria-label={`${badge} open`}
                              className="rounded-full bg-[var(--color-jarvis-surface-2)] px-1.5 text-[10px] font-semibold text-[var(--color-jarvis-muted)]"
                            >
                              {badge}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
        <p className="hidden border-t border-[var(--color-jarvis-border)] px-4 py-3 text-[10px] leading-relaxed text-[var(--color-jarvis-faint)] lg:block">
          AI proposes · policy authorizes · execution simulated · verified by read-back
        </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)]/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
            <RuntimeChips />
            {actions && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
