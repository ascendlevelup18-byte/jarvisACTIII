// Figure check: a specialist may only state numbers that the deterministic calculations can produce.
// Applied to every finding before it reaches a report, whichever provider wrote it.
import type { ScopedContext } from "./context.ts";

const NUM = /-?\$?\d[\d,]*(?:\.\d+)?\s*(?:%|h\b|pts?\b|points?\b)?/gi;

function parse(token: string): number | null {
  const n = Number(token.replace(/[$,%\s]|pts?|points?|h\b/gi, ""));
  return Number.isFinite(n) ? n : null;
}

/** Every number the scoped context can justify, plus small counts and calendar values. */
export function allowedFigures(ctx: ScopedContext): number[] {
  const out: number[] = [];
  for (const m of Object.values(ctx.metrics)) {
    if (!m) continue;
    out.push(m.first, m.last, m.change, Math.abs(m.change), ...m.series);
  }
  for (const t of Object.values(ctx.tools)) {
    if (!t) continue;
    for (const v of Object.values(t)) if (typeof v === "number") out.push(v, Math.abs(v));
  }
  return out;
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.051, Math.abs(b) * 0.005);

/** Numbers in the text that no calculation supports. Small integers (≤ 12), years and record ids are allowed. */
export function unsupportedFigures(text: string, ctx: ScopedContext, extra: number[] = []): string[] {
  const allowed = [...allowedFigures(ctx), ...extra];
  const bad: string[] = [];
  const cleaned = text.replace(/\bM-\d{4}-\d{2}\b/g, " ").replace(/\b20\d\d(-\d\d)?\b/g, " ");
  for (const raw of cleaned.match(NUM) ?? []) {
    const n = parse(raw);
    if (n === null) continue;
    if (Number.isInteger(n) && Math.abs(n) <= 12) continue;
    if (!allowed.some((a) => close(Math.abs(n), Math.abs(a)))) bad.push(raw.trim());
  }
  return bad;
}
