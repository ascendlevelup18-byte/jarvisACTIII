import type { Reason } from "../../lib/case-types.ts";
import { Panel } from "../ui/Panel.tsx";

export function ReasonsPanel({ reasons }: { reasons: Reason[] }) {
  if (reasons.length === 0) return null;
  return (
    <Panel title="Escalation / closure explanation" variant="danger">
      <ul className="space-y-2">
        {reasons.map((r, i) => (
          <li key={i}>
            <span className="font-mono text-xs font-semibold text-[var(--color-danger)]">{r.code}</span>
            <p className="text-sm">{r.detail}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
