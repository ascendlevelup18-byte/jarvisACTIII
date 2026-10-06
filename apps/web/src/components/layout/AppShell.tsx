import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-[var(--color-jarvis-border)] bg-white px-6 py-4">
        <div className="mx-auto max-w-[1600px]">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-jarvis-muted)]">
            Autonomous Commerce Operations
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-jarvis-ink)]">JARVIS Case Workspace</h1>
          <p className="mt-2 text-sm text-[var(--color-jarvis-muted)]">
            <span className="font-medium text-[var(--color-jarvis-ink)]">AI PROPOSES</span>
            <span className="mx-1.5 text-slate-300">→</span>
            <span className="font-semibold text-[var(--color-policy-accent)]">POLICY AUTHORIZES</span>
            <span className="mx-1.5 text-slate-300">→</span>
            <span className="font-medium text-[var(--color-jarvis-ink)]">EXECUTION</span>
            <span className="mx-1.5 text-slate-300">→</span>
            <span className="font-medium text-[var(--color-jarvis-ink)]">VERIFICATION</span>
            <span className="ml-2 text-xs">· Policy is the authority gate</span>
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-5">{children}</main>
    </div>
  );
}
