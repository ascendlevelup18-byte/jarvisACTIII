import { useEffect, useState } from "react";
import type { AuditEvent } from "../../lib/case-types.ts";
import { Panel } from "../ui/Panel.tsx";

function summarizeData(type: string, data: unknown): string {
  if (data == null || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (type === "POLICY_EVALUATED" && d.revalidation) return "(pre-execution revalidation)";
  if (type === "MODEL_CALL" && "action" in d) return `proposal: ${String(d.action)}`;
  if (type === "UNDERSTANDING_CALL" && "intent" in d) return `intent: ${String(d.intent)}`;
  if (type === "VERIFICATION" && "verified" in d) return `verified: ${String(d.verified)}`;
  if (type === "ACTION_ATTEMPTED" && "status" in d) return `status: ${String(d.status)}`;
  return "";
}

/** Live-looking audit stream replayed from REAL audit events — not a websocket. */
export function AuditTimelinePanel({ audit }: { audit: AuditEvent[] }) {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    setVisibleCount(1);
    if (audit.length <= 1) return;
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisibleCount(audit.length);
      return;
    }
    let i = 1;
    const id = window.setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= audit.length) window.clearInterval(id);
    }, 90);
    return () => window.clearInterval(id);
  }, [audit]);

  const shown = audit.slice(0, visibleCount);

  return (
    <Panel
      id="audit-stream"
      title="Audit stream"
      className="flex max-h-[520px] flex-col overflow-hidden"
    >
      <p className="mb-2 text-[10px] text-[var(--color-jarvis-muted)]">
        Real audit events replayed · not a live provider stream · {shown.length}/{audit.length}
      </p>
      <div className="overflow-y-auto pr-1">
        <ol className="relative border-l border-[var(--color-jarvis-border)] pl-4">
          {shown.map((ev, idx) => {
            const isLatest = idx === shown.length - 1 && shown.length < audit.length;
            return (
              <li key={ev.seq} className="motion-fade-in mb-4 ml-1">
                <span
                  className={`absolute -left-1.5 mt-1.5 h-2.5 w-2.5 rounded-full ${
                    isLatest
                      ? "motion-audit-pulse bg-[var(--color-deterministic-accent)]"
                      : "bg-[var(--color-jarvis-faint)]"
                  }`}
                />
                <p className="font-mono text-[10px] text-[var(--color-jarvis-muted)]">
                  #{ev.seq} · {ev.at} · {ev.type}
                </p>
                {ev.type === "STATE_TRANSITION" && (
                  <p className="text-sm font-medium">
                    {ev.from ?? "—"} → {ev.to ?? "—"}
                  </p>
                )}
                <p className="text-xs text-[var(--color-jarvis-muted)]">{summarizeData(ev.type, ev.data)}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </Panel>
  );
}
