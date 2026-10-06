import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMinor, normalizeCurrency, parseAmountToMinor, symbolOf } from "../src/money.ts";

test("parseAmountToMinor accepts common formats", () => {
  assert.equal(parseAmountToMinor("49.99", "USD"), 4999);
  assert.equal(parseAmountToMinor("$49.99", "USD"), 4999);
  assert.equal(parseAmountToMinor(" £ 49.9 ", "GBP"), 4990);
  assert.equal(parseAmountToMinor("49", "USD"), 4900);
  assert.equal(parseAmountToMinor("1,049.99", "USD"), 104999);
  assert.equal(parseAmountToMinor("0.01", "USD"), 1);
});

test("parseAmountToMinor rejects ambiguous or malformed input", () => {
  for (const bad of ["", "abc", "-5", "49.999", "1,00", "4 9", "1e3", "49.99.1", "$", "9999999999"]) {
    assert.equal(parseAmountToMinor(bad, "USD"), null, bad);
  }
});

test("currency helpers", () => {
  assert.equal(normalizeCurrency("usd"), "USD");
  assert.equal(normalizeCurrency("€"), "EUR");
  assert.equal(normalizeCurrency("XYZ"), null);
  assert.equal(symbolOf("£12.00"), "GBP");
  assert.equal(symbolOf("12.00"), null);
});

test("formatMinor", () => {
  assert.equal(formatMinor(4999, "USD"), "49.99 USD");
  assert.equal(formatMinor(5, "EUR"), "0.05 EUR");
  assert.equal(formatMinor(-100, "USD"), "-1.00 USD");
});
