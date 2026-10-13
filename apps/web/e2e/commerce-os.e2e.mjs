// Browser check of the merchant console (Orders, Inbox + Copilot, Analytics) against a RUNNING app (real API).
// Empty states first, then real storefront requests, then every merchant view reflects them truthfully.
// Run like proof-mode.e2e.mjs: PW_CORE=... CHROME=... node apps/web/e2e/commerce-os.e2e.mjs [screenshot-dir]
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

const { chromium } = await import(process.env.PW_CORE ?? "playwright-core");
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const OUT = process.argv[2] ?? null;
if (OUT) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME,
  args: ["--no-sandbox", "--disable-background-networking", "--disable-component-update"],
});
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(["PASS", name]);
  } catch (e) {
    results.push(["FAIL", `${name}: ${e.message.split("\n")[0]}`]);
  }
};
const shot = async (page, file, fullPage = true) => OUT && page.screenshot({ path: `${OUT}/${file}`, fullPage });
const skipSetup = (page) => page.addInitScript(() => localStorage.setItem("jarvis.setup.v1", JSON.stringify({ modules: ["refunds"] })));
const go = (page, label) => page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: new RegExp(`^${label}`) }).click();

async function requestFromStore(page, id) {
  await page.getByLabel("Order number").fill(id);
  await page.getByRole("button", { name: "Find order" }).click();
  await page.getByRole("article", { name: `Order ${id}` }).getByRole("button", { name: "Request a refund" }).click();
  await page.getByRole("button", { name: new RegExp(`Send for order #${id}`) }).click();
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await skipSetup(page);
  await page.goto(BASE);

  await check("honest empty states before any case: inbox and analytics invent nothing", async () => {
    await go(page, "Inbox");
    await page.getByText("No conversations yet").waitFor();
    await go(page, "Analytics");
    await page.getByText("No cases in this session yet").waitFor();
    const cases = page.locator("dt", { hasText: /^Cases$/ }).locator("xpath=following-sibling::dd").first();
    assert.equal(await cases.innerText(), "0");
  });

  await check("orders: 4 seeded orders from the backend, no case claims yet", async () => {
    await go(page, "Orders");
    const table = page.getByRole("table", { name: /Demo store orders/ });
    await table.waitFor();
    assert.equal(await table.locator("tbody tr").count(), 4);
    assert.equal(await table.getByText("No case", { exact: true }).count(), 4);
  });

  await check("storefront: valid refund, unsafe escalation and conflicting amount; customer copy matches outcomes", async () => {
    await page.getByRole("button", { name: "Open demo store" }).click();
    await requestFromStore(page, "48291");
    await page.getByText("Refund of $89.99 issued").waitFor({ timeout: 10000 });
    await requestFromStore(page, "48294");
    await page.getByText("Passed to our team for review").first().waitFor({ timeout: 10000 });
    await requestFromStore(page, "48292");
    await page.waitForFunction(() => document.querySelectorAll('[aria-label="Support conversation"] li div').length >= 3, null, { timeout: 10000 });
    // Exactly one success reply: escalations never read as refunds.
    assert.equal(await page.getByText(/^Refund of \$[\d.]+ issued$/).count(), 1);
    assert.equal(await page.getByText("No refund has been made yet", { exact: false }).count(), 2);
    const progress = await page.getByRole("list", { name: "Request progress" }).innerText();
    assert.match(progress, /With our team/);
  });
  await shot(page, "c01-store-widget.png", false);

  await check("orders: rows join the real cases; search, filter and detail with linked evidence", async () => {
    await page.getByRole("button", { name: /Merchant command center/ }).click();
    await go(page, "Orders");
    const table = page.getByRole("table", { name: /Demo store orders/ });
    const row = (id) => table.locator("tr", { hasText: `#${id}` });
    assert.match(await row("48291").innerText(), /Refunded by JARVIS \(simulated\)[\s\S]*RESOLVED[\s\S]*Verified/);
    assert.match(await row("48294").innerText(), /Refund blocked[\s\S]*ESCALATED[\s\S]*Not executed/);
    await page.getByLabel("Search orders").fill("cy sample");
    assert.equal(await table.locator("tbody tr").count(), 1);
    await page.getByLabel("Search orders").fill("");
    await page.getByRole("radiogroup", { name: "Order status" }).getByRole("radio", { name: "Needs review" }).click();
    assert.equal(await table.locator("tbody tr").count(), 2);
    await page.getByRole("radiogroup", { name: "Order status" }).getByRole("radio", { name: "All" }).click();
    await page.getByRole("button", { name: "#48292" }).click();
    const detail = page.getByRole("complementary", { name: "Order 48292 details" });
    await detail.getByText("I was charged twice for order #48292").waitFor();
    await detail.getByText(/DENY · 17\/18 checks/).waitFor();
  });
  await shot(page, "c02-orders-detail.png");

  await check("orders: detail opens the linked case investigation", async () => {
    await page.getByRole("complementary", { name: "Order 48292 details" }).getByRole("button", { name: "Open case evidence" }).click();
    await page.getByRole("heading", { name: "Why JARVIS refused to refund" }).waitFor();
    await page.getByRole("button", { name: /Back to operations/ }).click();
  });

  await check("inbox: 3 panes; history is only recorded messages; copilot is internal and never claims a refund", async () => {
    await go(page, "Inbox");
    const queue = page.getByRole("region", { name: "Conversation queue" });
    assert.equal(await queue.getByRole("listitem").count(), 3);
    await queue.getByRole("button", { name: /Dee Placeholder/ }).click();
    const convo = page.getByRole("region", { name: "Conversation with Dee Placeholder" });
    assert.equal(await convo.getByRole("list", { name: "Message history" }).getByRole("listitem").count(), 2);
    await convo.getByText("Reply shown to customer in the demo store", { exact: false }).waitFor();
    assert.equal(await convo.getByLabel("Reply to customer").isDisabled(), true);
    await convo.getByText(/needs an operator token/).waitFor();
    const copilot = page.getByRole("complementary", { name: "JARVIS Copilot" });
    await copilot.getByText("Internal · not visible to the customer", { exact: false }).waitFor();
    await copilot.getByText("No execution authority").waitFor();
    await copilot.getByText(/Human review required/).waitFor();
    await copilot.getByText(/Not executed: no refund was sent/).waitFor();
    assert.equal(await copilot.getByText(/Verified: read-back observed/).count(), 0);
    // Copilot content never leaks into the customer-visible conversation.
    assert.equal(await convo.getByText("No execution authority").count(), 0);
  });
  await shot(page, "c03-inbox-copilot.png");

  await check("inbox: filter, search, and the resolved thread is verified", async () => {
    const queue = page.getByRole("region", { name: "Conversation queue" });
    await queue.getByRole("radio", { name: "Needs human" }).click();
    assert.equal(await queue.getByRole("listitem").count(), 2);
    await queue.getByRole("radio", { name: "All" }).click();
    await page.getByLabel("Search conversations").fill("ada");
    assert.equal(await queue.getByRole("listitem").count(), 1);
    await queue.getByRole("button", { name: /Ada Fictional/ }).click();
    await page.getByRole("complementary", { name: "JARVIS Copilot" }).getByText(/Verified: read-back observed refund/).waitFor();
    await page.getByLabel("Search conversations").fill("");
  });

  await check("analytics: KPIs, charts and AI calls computed from the 3 real cases", async () => {
    await go(page, "Analytics");
    const kpi = (label) => page.locator("dt", { hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::dd").first().innerText();
    assert.equal(await kpi("Cases"), "3");
    assert.equal(await kpi("Resolved \\(verified\\)"), "1");
    assert.equal(await kpi("Escalated to a human"), "2");
    assert.equal(await kpi("Refunds verified"), "$89.99");
    await page.getByRole("img", { name: /3 cases — 1 resolved, 2 escalated/ }).waitFor();
    const ai = page.getByRole("table", { name: /AI calls/ });
    assert.match(await ai.innerText(), /fixture-understanding\s+3/);
    await page.getByText("DC-S04 escalated conservatively").waitFor();
    await page.getByRole("radiogroup", { name: "Source" }).getByRole("radio", { name: "Console" }).click();
    await page.getByText("No cases match these filters").waitFor();
    await page.getByRole("radiogroup", { name: "Source" }).getByRole("radio", { name: "All sources" }).click();
    await page.getByLabel("Date range").selectOption("15m");
    assert.equal(await kpi("Cases"), "3");
  });
  await shot(page, "c04-analytics.png");

  await check("desktop navigation reaches every page with no runtime errors", async () => {
    for (const label of ["Overview", "Orders", "Inbox", "Cases", "Approvals", "Automations", "Analytics", "Audit trail", "AI provider"]) {
      await go(page, label);
      const current = page.getByRole("navigation", { name: "Primary" }).locator('[aria-current="page"]');
      assert.match(await current.innerText(), new RegExp(`^${label}`));
    }
    assert.deepEqual(errors, []);
  });
  await go(page, "Overview");
  await page.waitForTimeout(300); // let the nav highlight transition settle
  await shot(page, "c05-overview.png", false);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: "reduce" });
  mobile.setDefaultTimeout(8000);
  await skipSetup(mobile);
  await mobile.goto(`${BASE}/#store`);
  await check("mobile: storefront refund, then orders / inbox / analytics without horizontal scroll", async () => {
    await requestFromStore(mobile, "48291");
    await mobile.getByText("Refund of $89.99 issued").waitFor({ timeout: 10000 });
    await mobile.getByRole("button", { name: /Merchant command center/ }).click();
    for (const label of ["Orders", "Inbox", "Analytics"]) {
      await go(mobile, label);
      await mobile.waitForTimeout(200);
      const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `${label} overflows by ${overflow}px`);
    }
    await go(mobile, "Inbox");
    await mobile.getByRole("complementary", { name: "JARVIS Copilot" }).waitFor();
  });
  await shot(mobile, "c06-mobile-inbox.png");
} finally {
  await browser.close();
}

for (const [s, n] of results) console.log(`${s}  ${n}`);
const failed = results.filter(([s]) => s === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
