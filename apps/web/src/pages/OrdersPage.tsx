import { useMemo, useState } from "react";
import { Card, EmptyState, ErrorNotice, LoadingRows, PageHeader, Pill, Segmented, type PillTone } from "../components/ui/Primitives.tsx";
import { btn, inputCls } from "../components/ui/styles.ts";
import { StateBadge } from "../components/ui/StateBadge.tsx";
import {
  buildOrderRows,
  filterOrderRows,
  ORDER_FILTER_LABELS,
  type OrderRow,
  type OrderStatusFilter,
  type PaymentState,
  type RefundState,
  type VerificationState,
} from "../lib/commerce.ts";
import { describeOrderBalance, type DemoStoreOrder, type DemoStoreSnapshot } from "../lib/demo-store.ts";
import { formatMinor } from "../lib/money.ts";
import type { SessionCaseEntry } from "../lib/session-store.ts";

export type StoreLoad = { status: "idle" | "loading" } | { status: "error"; error: string };

const PAYMENT_TONE: Record<PaymentState, PillTone> = {
  Paid: "success",
  "Charged twice": "warning",
  "Paid, extra charge refunded": "neutral",
  "Partially refunded": "neutral",
  Unpaid: "danger",
};
const REFUND_TONE: Record<RefundState, PillTone> = {
  None: "neutral",
  "Refunded before JARVIS": "neutral",
  "Refunded by JARVIS (simulated)": "success",
  "Refund blocked": "warning",
  "Refund not confirmed": "danger",
};
const VERIFY_TONE: Record<VerificationState, PillTone> = {
  Verified: "success",
  "Not verified": "danger",
  "Not executed": "neutral",
  "—": "neutral",
};

export function OrdersPage({
  snapshot,
  load,
  onReload,
  history,
  onOpenCase,
  onRunOrder,
}: {
  snapshot: DemoStoreSnapshot | null;
  load: StoreLoad;
  onReload: () => void;
  history: SessionCaseEntry[];
  onOpenCase: (e: SessionCaseEntry) => void;
  /** Sends the order's fixed customer request through POST /cases (a real case). */
  onRunOrder: (o: DemoStoreOrder) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OrderStatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = useMemo(() => (snapshot ? buildOrderRows(snapshot, history) : []), [snapshot, history]);
  const visible = filterOrderRows(rows, query, status);
  const selected = rows.find((r) => r.order.orderId === selectedId) ?? null;

  return (
    <div className="motion-fade-in space-y-4">
      <PageHeader
        title="Orders"
        description={
          snapshot ? (
            <>
              {snapshot.store.name} · {snapshot.orders.length} orders from <code className="text-xs">GET /api/demo-store</code>. Synthetic data;
              payments are simulated; fulfilment is not modelled.
            </>
          ) : (
            "Orders from the demo store on the JARVIS backend."
          )
        }
      />

      {load.status === "error" && <ErrorNotice onRetry={onReload}>Could not load the demo store: {load.error}</ErrorNotice>}
      {!snapshot && load.status === "loading" && <LoadingRows label="Loading orders" />}
      {!snapshot && load.status === "idle" && (
        <EmptyState
          title="Demo store not loaded"
          body="Orders are read from the backend's seeded demo store."
          action={
            <button type="button" className={btn.primary} onClick={onReload}>
              Load orders
            </button>
          }
        />
      )}

      {snapshot && (
        <div className={`grid gap-4 ${selected ? "xl:grid-cols-[minmax(0,1fr)_400px]" : ""}`}>
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-48 flex-1 sm:max-w-xs">
                <label htmlFor="orders-search" className="sr-only">
                  Search orders
                </label>
                <input
                  id="orders-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search order, customer…"
                  className={inputCls}
                />
              </div>
              <Segmented
                label="Order status"
                value={status}
                onChange={setStatus}
                options={(Object.keys(ORDER_FILTER_LABELS) as OrderStatusFilter[]).map((v) => ({ value: v, label: ORDER_FILTER_LABELS[v] }))}
              />
            </div>

            {visible.length === 0 ? (
              <EmptyState title="No orders match" body="Clear the search or choose another status filter." />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface)] shadow-card">
                <table className={`w-full text-left text-sm ${selected ? "min-w-[520px]" : "min-w-[860px]"}`}>
                  <caption className="sr-only">Demo store orders with their JARVIS case state</caption>
                  <thead className="border-b border-[var(--color-jarvis-border)] bg-[var(--color-jarvis-surface-2)] text-xs text-[var(--color-jarvis-muted)]">
                    <tr>
                      {(selected ? COMPACT_COLUMNS : COLUMNS).map((h) => (
                        <th key={h} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-jarvis-border)]">
                    {visible.map((r) => (
                      <OrderTableRow key={r.order.orderId} row={r} compact={!!selected} selected={r.order.orderId === selectedId} onSelect={() => setSelectedId(r.order.orderId)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-[var(--color-jarvis-faint)]">
              Payment state is the seeded record. Each JARVIS run uses a fresh copy of the store, so a simulated refund shows in the
              Refund column, not in the seed.
            </p>
          </div>

          {selected && <OrderDetail row={selected} onClose={() => setSelectedId(null)} onOpenCase={onOpenCase} onRunOrder={onRunOrder} />}
        </div>
      )}
    </div>
  );
}

const COLUMNS = ["Order", "Customer", "Date", "Total", "Payment", "Refund", "JARVIS case", "Resolution", "Verification"];
// With the detail panel open, date, payment, case id and verification are shown in the panel instead.
const COMPACT_COLUMNS = ["Order", "Customer", "Total", "Refund", "Resolution"];

function OrderTableRow({ row, selected, compact, onSelect }: { row: OrderRow; selected: boolean; compact: boolean; onSelect: () => void }) {
  const o = row.order;
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer ${selected ? "bg-[var(--color-deterministic)]" : "hover:bg-[var(--color-jarvis-surface-2)]"}`}
    >
      <td className="whitespace-nowrap px-3 py-2.5">
        <button type="button" onClick={onSelect} aria-current={selected ? "true" : undefined} className="font-semibold text-[var(--color-deterministic-accent)] hover:underline">
          #{o.orderId}
        </button>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <span className="text-[var(--color-jarvis-ink)]">{o.customerName}</span>
        {!compact && <span className="ml-1 font-mono text-[11px] text-[var(--color-jarvis-faint)]">{o.customerId}</span>}
      </td>
      {!compact && <td className="whitespace-nowrap px-3 py-2.5 text-[var(--color-jarvis-muted)]">{new Date(o.placedAt).toLocaleDateString()}</td>}
      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatMinor(o.totalMinor, o.currency)}</td>
      {!compact && (
        <td className="px-3 py-2.5">
          <Pill tone={PAYMENT_TONE[row.paymentState]}>{row.paymentState}</Pill>
        </td>
      )}
      <td className="px-3 py-2.5">
        <Pill tone={REFUND_TONE[row.refundState]}>{row.refundState}</Pill>
      </td>
      {!compact && (
        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-[var(--color-jarvis-muted)]">
          {row.latestCase ? `${row.latestCase.id.slice(0, 13)}…${row.caseCount > 1 ? ` (+${row.caseCount - 1})` : ""}` : "—"}
        </td>
      )}
      <td className="px-3 py-2.5">{row.resolution ? <StateBadge state={row.resolution} /> : <span className="text-[var(--color-jarvis-faint)]">No case</span>}</td>
      {!compact && (
        <td className="px-3 py-2.5">
          <Pill tone={VERIFY_TONE[row.verification]}>{row.verification}</Pill>
        </td>
      )}
    </tr>
  );
}

function OrderDetail({
  row,
  onClose,
  onOpenCase,
  onRunOrder,
}: {
  row: OrderRow;
  onClose: () => void;
  onOpenCase: (e: SessionCaseEntry) => void;
  onRunOrder: (o: DemoStoreOrder) => Promise<void>;
}) {
  const o = row.order;
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = row.latestCase?.caseData ?? null;

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      await onRunOrder(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <aside aria-label={`Order ${o.orderId} details`} className="space-y-3">
      <Card
        title={`Order #${o.orderId}`}
        aside={
          <button type="button" onClick={onClose} className={btn.ghost} aria-label="Close order details">
            Close
          </button>
        }
      >
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Customer" value={`${o.customerName} · ${o.customerId}`} />
          <Field label="Placed" value={new Date(o.placedAt).toLocaleString()} />
          <Field label="Order total" value={formatMinor(o.totalMinor, o.currency)} />
          <Field label="Payment" value={row.paymentState} />
        </dl>
        <p className="mt-2 text-xs text-[var(--color-jarvis-muted)]">{describeOrderBalance(o)}</p>
        <table className="mt-3 w-full text-left text-xs">
          <caption className="sr-only">Charges on this order</caption>
          <thead className="text-[var(--color-jarvis-muted)]">
            <tr>
              <th className="py-1 font-medium">Charge</th>
              <th className="py-1 font-medium">Status</th>
              <th className="py-1 text-right font-medium">Amount</th>
              <th className="py-1 text-right font-medium">Refunded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-jarvis-border)] tabular-nums">
            {o.charges.map((ch) => (
              <tr key={ch.id}>
                <td className="py-1.5 font-mono">{ch.id}</td>
                <td className="py-1.5">{ch.status.toLowerCase()}</td>
                <td className="py-1.5 text-right">{formatMinor(ch.amountMinor, ch.currency)}</td>
                <td className="py-1.5 text-right">{formatMinor(ch.refundedMinor, ch.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Customer request" aside="Fixed demo message">
        <blockquote className="rounded-md bg-[var(--color-jarvis-surface-2)] px-3 py-2 text-sm text-[var(--color-jarvis-ink)]">
          {o.supportRequest.message}
        </blockquote>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className={btn.secondary} disabled={running} onClick={run}>
            {running ? "Running JARVIS…" : "Run JARVIS on this request"}
          </button>
          <span className="text-xs text-[var(--color-jarvis-faint)]">Real POST /cases · simulated payments</span>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </Card>

      <Card title="Linked JARVIS cases" aside={`${row.caseCount} this session`}>
        {row.caseCount === 0 || !row.latestCase ? (
          <p className="text-sm text-[var(--color-jarvis-muted)]">No case yet. Run JARVIS above, or request a refund from the demo store.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge state={row.latestCase.state} />
              <span className="font-mono text-[11px] text-[var(--color-jarvis-faint)]">{row.latestCase.id}</span>
              <Pill tone={REFUND_TONE[row.refundState]}>{row.refundState}</Pill>
              <Pill tone={VERIFY_TONE[row.verification]}>{row.verification}</Pill>
            </div>
            {c?.evidence && (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <Field label="Financial status" value={c.evidence.financial.status.replaceAll("_", " ").toLowerCase()} />
                <Field label="Duplicate groups" value={String(c.evidence.duplicateGroups.length)} />
                <Field label="Contradictions" value={c.evidence.contradictions.length ? c.evidence.contradictions.join("; ") : "none"} />
                <Field
                  label="Policy"
                  value={c.authorization ? `${c.authorization.outcome} · ${c.authorization.checks.filter((k) => k.passed).length}/${c.authorization.checks.length} checks` : "not evaluated"}
                />
              </dl>
            )}
            <button type="button" className={btn.primary} onClick={() => onOpenCase(row.latestCase!)}>
              Open case evidence
            </button>
          </div>
        )}
      </Card>
    </aside>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[var(--color-jarvis-muted)]">{label}</dt>
      <dd className="break-words text-[var(--color-jarvis-ink)]">{value}</dd>
    </div>
  );
}
