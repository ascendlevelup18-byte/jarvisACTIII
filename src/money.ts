// All money is integer minor units. No floating point arithmetic on amounts, ever.
import { CURRENCIES, type Currency } from "./contracts.ts";

const MINOR_DIGITS: Record<Currency, number> = { USD: 2, EUR: 2, GBP: 2 };
const SYMBOLS: Record<string, Currency> = { $: "USD", "€": "EUR", "£": "GBP" };

// Accepts "49.99", "$49.99", "1,049.99", "49". Rejects anything ambiguous.
const DECIMAL_RE = /^\s*([$€£])?\s*(\d{1,3}(?:,\d{3})+|\d{1,9})(?:\.(\d{1,2}))?\s*$/;

export function parseAmountToMinor(text: string, currency: Currency): number | null {
  const m = DECIMAL_RE.exec(text);
  if (!m) return null;
  const whole = Number(m[2]!.replaceAll(",", ""));
  const digits = MINOR_DIGITS[currency];
  const frac = Number((m[3] ?? "").padEnd(digits, "0"));
  const minor = whole * 10 ** digits + frac;
  return Number.isSafeInteger(minor) ? minor : null;
}

// Resolves "USD", "usd", "$" etc. Returns null for anything unrecognised.
export function normalizeCurrency(text: string): Currency | null {
  const t = text.trim();
  if (t in SYMBOLS) return SYMBOLS[t]!;
  const upper = t.toUpperCase();
  return (CURRENCIES as readonly string[]).includes(upper) ? (upper as Currency) : null;
}

export function symbolOf(text: string): Currency | null {
  const m = DECIMAL_RE.exec(text);
  return m?.[1] ? SYMBOLS[m[1]]! : null;
}

export function formatMinor(minor: number, currency: Currency): string {
  const digits = MINOR_DIGITS[currency];
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 10 ** digits);
  const frac = String(abs % 10 ** digits).padStart(digits, "0");
  return `${sign}${whole}.${frac} ${currency}`;
}

export function isValidMinor(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 0;
}
