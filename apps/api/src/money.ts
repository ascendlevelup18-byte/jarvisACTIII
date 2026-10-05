// Money is integer minor units. No floating point arithmetic on amounts.
import type { Currency, MoneyMention } from "./contracts.ts";

const SYMBOL: Record<string, Currency> = { $: "USD", "€": "EUR", "£": "GBP" };
const NUM = String.raw`(\d{1,3}(?:,\d{3})+|\d{1,9})(?:\.(\d{1,2}))?`;
// "$89.99", "€ 1,250", "250.00 USD", "250 eur". Bare numbers ("order 48291") are not money.
const MENTION_RE = new RegExp(String.raw`([$€£])\s?${NUM}|${NUM}\s?(USD|EUR|GBP)\b`, "gi");

function toMinor(whole: string, frac: string | undefined): number | null {
  const minor = Number(whole.replaceAll(",", "")) * 100 + Number((frac ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

export function findMoneyMentions(text: string): MoneyMention[] {
  const out: MoneyMention[] = [];
  for (const m of text.matchAll(MENTION_RE)) {
    const currency = m[1] ? SYMBOL[m[1]] : (m[6]?.toUpperCase() as Currency | undefined);
    const minor = m[1] ? toMinor(m[2]!, m[3]) : toMinor(m[4]!, m[5]);
    if (currency && minor !== null) out.push({ text: m[0], amountMinor: minor, currency });
  }
  return out;
}

export function formatMinor(minor: number, currency: Currency): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")} ${currency}`;
}
