// Browser check of the merchant workspace (Dashboard, Orders, Customers, Support inbox + Copilot,
// Analytics, Approvals, Audit, routing) against a RUNNING app with the real API.
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
const kpi = (page, label) => page.locator("dt", { hasText: new RegExp(`^${label}$`) }).locator("xpath=following-sibling::dd").first().innerText();

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

  await check("lands on the dashboard; honest empty states before any case", async () => {
    await page.getByRole("heading", { name: "Dashboard" }).waitFor();
    await page.getByText("Nothing recorded yet").waitFor();
    await go(page, "Support inbox");
    await page.getByText("No conversations yet").waitFor();
    await go(page, "Analytics");
    await page.getByText("No recorded cases yet", { exact: true }).waitFor();
    assert.equal(await kpi(page, "Recorded cases"), "0");
    await page.getByRole("region", { name: "Cases over time" }).getByText("No cases in this period.").waitFor();
  });

  await check("analytics sample mode is labelled, separate, and drills into its own records", async () => {
    await page.getByRole("radiogroup", { name: "Dataset" }).getByRole("radio", { name: "Sample data" }).click();
    await page.getByRole("note").getByText("Sample data.").waitFor();
    assert.notEqual(await kpi(page, "Sample cases"), "0");
    // Sample figures never read as real money or a merchant's history.
    assert.equal(await page.locator("dt", { hasText: /^Verified simulated refunds$/ }).count(), 0);
    await page.getByText("Illustrative only: not money, not a merchant's history").waitFor();
    await page.getByRole("region", { name: "Resolution vs escalation" }).getByRole("button", { name: /Escalated to a person/ }).click();
    const report = page.getByRole("region", { name: "Case report" });
    await report.getByText(/Clear filter: Escalated to a person/).waitFor();
    const outcomes = await report.locator("tbody tr td:nth-child(5)").allInnerTexts();
    assert.ok(outcomes.length > 0 && outcomes.every((t) => t.trim() === "ESCALATED"));
    assert.ok((await report.getByText("Sample record").count()) > 0);
    if (OUT) await page.screenshot({ path: `${OUT}/c07-analytics-sample.png`, fullPage: true });
    await page.getByRole("radiogroup", { name: "Dataset" }).getByRole("radio", { name: "Recorded" }).click();
    assert.equal(await kpi(page, "Recorded cases"), "0");
  });

  await check("orders: 4 seeded orders from the backend, no case claims yet; sorting works", async () => {
    await go(page, "Orders");
    const table = page.getByRole("table", { name: /Demo store orders/ });
    await table.waitFor();
    assert.equal(await table.locator("tbody tr").count(), 4);
    assert.equal(await table.getByText("No case", { exact: true }).count(), 4);
    await table.getByRole("button", { name: /^Value/ }).click();
    await table.getByRole("button", { name: /^Value/ }).click();
    assert.match(await table.locator("tbody tr").first().innerText(), /#48292/); // $180.00 first when descending
    assert.equal(await table.locator("th", { hasText: "Value" }).getAttribute("aria-sort"), "descending");
  });

  await check("storefront: valid refund, unsafe escalation, already refunded, conflicting amount; customer copy matches outcomes", async () => {
    await page.getByRole("button", { name: "Open demo store" }).click();
    await requestFromStore(page, "48291");
    await page.getByText("Refund of $89.99 issued").waitFor({ timeout: 10000 });
    await requestFromStore(page, "48294");
    await page.getByText("Passed to our team for review").first().waitFor({ timeout: 10000 });
    await requestFromStore(page, "48293");
    await page.getByText("No duplicate charge to refund").waitFor({ timeout: 10000 });
    await requestFromStore(page, "48292");
    await page.waitForFunction(() => document.querySelectorAll('[aria-label="Support conversation"] li div').length >= 4, null, { timeout: 10000 });
    // Exactly one success reply: escalations and the already-refunded order never read as refunds.
    assert.equal(await page.getByText(/^Refund of \$[\d.]+ issued$/).count(), 1);
    assert.equal(await page.getByText("No refund has been made yet", { exact: false }).count(), 2);
    assert.match(await page.getByRole("list", { name: "Request progress" }).innerText(), /With our team/);
  });
  await shot(page, "c01-store-widget.png", false);

  await check("orders: rows join the real cases; search, filter and detail with decision history", async () => {
    await page.getByRole("button", { name: /Merchant command center/ }).click();
    await go(page, "Orders");
    const table = page.getByRole("table", { name: /Demo store orders/ });
    const row = (id) => table.locator("tr", { hasText: `#${id}` });
    assert.match(await row("48291").innerText(), /Refunded by JARVIS \(simulated\)[\s\S]*RESOLVED[\s\S]*Verified/);
    assert.match(await row("48294").innerText(), /Refund blocked[\s\S]*ESCALATED[\s\S]*Not executed/);
    assert.match(await row("48293").innerText(), /Refunded before JARVIS[\s\S]*CLOSED NO ACTION[\s\S]*Not executed/);
    if (OUT) await page.screenshot({ path: `${OUT}/c11-orders.png`, fullPage: false });
    await page.getByLabel("Search orders", { exact: true }).fill("cy sample");
    assert.equal(await table.locator("tbody tr").count(), 1);
    await page.getByLabel("Search orders", { exact: true }).fill("");
    await page.getByRole("radiogroup", { name: "Order status" }).getByRole("radio", { name: "Needs review" }).click();
    assert.equal(await table.locator("tbody tr").count(), 2);
    // Opening an order keeps the active filter (regression: selection used to remount the page).
    await page.getByRole("button", { name: "#48294" }).click();
    await page.getByRole("complementary", { name: "Order 48294 details" }).waitFor();
    assert.equal(await table.locator("tbody tr").count(), 2);
    assert.equal(await page.getByRole("radio", { name: "Needs review" }).getAttribute("aria-checked"), "true");
    await page.getByRole("radiogroup", { name: "Order status" }).getByRole("radio", { name: "All" }).click();
    await page.getByRole("button", { name: "#48292" }).click();
    const detail = page.getByRole("complementary", { name: "Order 48292 details" });
    await detail.getByText("I was charged twice for order #48292").waitFor();
    await detail.getByText(/DENY · 17\/18 checks/).waitFor();
    assert.equal(await detail.getByRole("list", { name: "Decision history" }).getByRole("listitem").count(), 1);
    assert.match(page.url(), /#\/orders\/48292$/);
  });
  await shot(page, "c02-orders-detail.png");

  await check("deep links and browser back/forward: order detail → case → back", async () => {
    await page.getByRole("complementary", { name: "Order 48292 details" }).getByRole("button", { name: "Open case evidence" }).click();
    await page.getByRole("heading", { name: "Why JARVIS refused to refund" }).waitFor();
    assert.match(page.url(), /#\/case\/CASE-/);
    await page.goBack();
    await page.getByRole("complementary", { name: "Order 48292 details" }).waitFor();
    await page.goForward();
    await page.getByRole("heading", { name: "Why JARVIS refused to refund" }).waitFor();
    await page.getByRole("button", { name: /Back to Orders/ }).click();
    await page.goto(`${BASE}/#/orders/48291`);
    await page.getByRole("complementary", { name: "Order 48291 details" }).getByText(/Verification\s*Verified/).waitFor();
  });

  await check("recorded cases persist across a reload (this browser only)", async () => {
    await page.reload();
    await go(page, "Analytics");
    assert.equal(await kpi(page, "Recorded cases"), "4");
  });

  await check("support inbox: 3 panes; recorded messages only; Copilot keeps PROPOSED / APPROVED / EXECUTED / VERIFIED / ESCALATED distinct", async () => {
    await go(page, "Support inbox");
    const queue = page.getByRole("region", { name: "Conversation queue" });
    assert.equal(await queue.getByRole("listitem").count(), 4);
    await queue.getByRole("button", { name: /Dee Placeholder/ }).click();
    const convo = page.getByRole("region", { name: "Conversation with Dee Placeholder" });
    assert.equal(await convo.getByRole("list", { name: "Message history" }).getByRole("listitem").count(), 2);
    await convo.getByText("Reply shown to customer in the demo store", { exact: false }).waitFor();
    assert.equal(await convo.getByLabel("Reply to customer").isDisabled(), true);
    await convo.getByText(/needs an operator token/).waitFor();
    assert.match(await convo.getByRole("list", { name: "Case progression" }).innerText(), /POLICY VALIDATION[\s\S]*ESCALATED$/);
    const copilot = page.getByRole("complementary", { name: "JARVIS Copilot" });
    await copilot.getByText("Internal · not visible to the customer", { exact: false }).waitFor();
    const ladder = copilot.getByRole("list", { name: "Control-plane status" });
    const text = await ladder.innerText();
    assert.match(text, /PROPOSED[\s\S]*Reached|Reached: AI proposed/);
    for (const k of ["APPROVED", "EXECUTED", "VERIFIED"]) assert.match(text, new RegExp(`${k}\\s*Not reached`));
    assert.match(text, /ESCALATED\s*Reached:\s*Routed to a person/);
    await copilot.getByText(/Human review required/).waitFor();
    assert.equal(await convo.getByText("No execution authority").count(), 0);
  });
  await shot(page, "c03-inbox-copilot.png");

  await check("support inbox: the resolved thread is approved, executed and verified", async () => {
    const queue = page.getByRole("region", { name: "Conversation queue" });
    await page.getByLabel("Search conversations").fill("ada");
    assert.equal(await queue.getByRole("listitem").count(), 1);
    await queue.getByRole("button", { name: /Ada Fictional/ }).click();
    const text = await page.getByRole("complementary", { name: "JARVIS Copilot" }).getByRole("list", { name: "Control-plane status" }).innerText();
    for (const k of ["APPROVED", "EXECUTED", "VERIFIED"]) assert.match(text, new RegExp(`${k}\\s*Reached`));
    assert.match(text, /ESCALATED\s*Not reached/);
    await page.getByLabel("Search conversations").fill("");
  });

  await check("analytics: KPIs, charts and drill-down computed from the 4 real cases", async () => {
    await go(page, "Analytics");
    assert.equal(await kpi(page, "Recorded cases"), "4");
    assert.equal(await kpi(page, "Resolved \\(verified\\)"), "1");
    assert.equal(await kpi(page, "Escalated to a person"), "2");
    assert.equal(await kpi(page, "Verified simulated refunds"), "$89.99");
    assert.equal(await kpi(page, "Pending reviews"), "2");
    assert.equal(await kpi(page, "Orders in demo store"), "4");
    await page.getByRole("group", { name: /4 total — 1 Resolved \(verified\), 2 Escalated to a person, 1 Closed, no action/ }).waitFor();
    await page.getByRole("region", { name: "Automation activity" }).getByText(/Understanding · fixture-understanding/).waitFor();
    await page.getByRole("region", { name: "Refund outcomes" }).getByRole("button", { name: /Refund verified/ }).click();
    const report = page.getByRole("region", { name: "Case report" });
    assert.equal(await report.locator("tbody tr").count(), 1);
    await report.getByRole("button", { name: "Open evidence" }).click();
    await page.getByRole("heading", { name: "Why the refund was allowed" }).waitFor();
    await page.getByRole("button", { name: /Back to Analytics/ }).click();
    await page.getByRole("radiogroup", { name: "Source" }).getByRole("radio", { name: "Console" }).click();
    await page.getByText("No recorded cases in this range").waitFor();
    await page.getByRole("radiogroup", { name: "Source" }).getByRole("radio", { name: "All sources" }).click();
    await page.getByLabel("Date range").selectOption("7d");
    assert.equal(await kpi(page, "Recorded cases"), "4");
    await page.getByText("DC-S04 escalated conservatively").waitFor();
  });
  await shot(page, "c04-analytics.png");

  await check("approvals is a review-only queue with reasons; audit trail filters by kind and case", async () => {
    await page.getByRole("button", { name: /2 pending review/ }).click();
    await page.getByRole("heading", { name: "Approvals" }).waitFor();
    await page.getByText("Review-only", { exact: true }).waitFor();
    const rows = page.getByRole("table", { name: /awaiting human review/ }).locator("tbody tr");
    assert.equal(await rows.count(), 2);
    assert.match(await rows.first().innerText(), /EVIDENCE CONTRADICTION/);
    assert.equal(await page.getByRole("button", { name: /^Approve/ }).count(), 0);
    await go(page, "Audit trail");
    await page.getByLabel("Filter by case, order or customer").fill("48291");
    await page.getByRole("radiogroup", { name: "Event kind" }).getByRole("radio", { name: "Execution & verification" }).click();
    const events = page.getByRole("list", { name: /Audit events for case/ });
    assert.match(await events.innerText(), /Refund sent to simulated gateway[\s\S]*Read-back verification · verified/);
  });
  await shot(page, "c08-approvals.png", false);

  await check("global search jumps to an order; customers page links to their orders", async () => {
    await page.getByLabel("Search orders, customers and cases").fill("4829");
    await page.getByRole("option", { name: /#48293/ }).click();
    await page.getByRole("complementary", { name: "Order 48293 details" }).waitFor();
    await go(page, "Customers");
    const table = page.getByRole("table", { name: "Customers" });
    assert.equal(await table.locator("tbody tr").count(), 4);
    await table.locator("tr", { hasText: "Ben Example" }).getByRole("button", { name: "View orders" }).click();
    assert.equal(await page.getByRole("table", { name: /Demo store orders/ }).locator("tbody tr").count(), 1);
  });

  await check("desktop navigation reaches every page with no runtime errors", async () => {
    for (const label of ["Dashboard", "Proof Mode", "Orders", "Customers", "Support inbox", "Automation catalog", "Cases", "Approvals", "Analytics", "Audit trail", "AI provider", "Settings"]) {
      await go(page, label);
      const current = page.getByRole("navigation", { name: "Primary" }).locator('[aria-current="page"]');
      assert.match(await current.innerText(), new RegExp(`^${label}`));
    }
    assert.deepEqual(errors, []);
  });
  await go(page, "Dashboard");
  await page.waitForTimeout(300); // let the nav highlight transition settle
  await shot(page, "c05-overview.png", false);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: "reduce" });
  mobile.setDefaultTimeout(8000);
  await skipSetup(mobile);
  await mobile.goto(`${BASE}/#store`);
  await check("mobile: storefront refund, then orders / inbox / analytics without horizontal scroll", async () => {
    await requestFromStore(mobile, "48291");
    await mobile.getByText("Refund of $89.99 issued").waitFor({ timeout: 10000 });
    await shot(mobile, "c09-mobile-store.png", false);
    await mobile.getByRole("button", { name: /Merchant command center/ }).click();
    for (const label of ["Orders", "Support inbox", "Analytics"]) {
      await go(mobile, label);
      await mobile.waitForTimeout(200);
      const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `${label} overflows by ${overflow}px`);
    }
    await go(mobile, "Orders");
    await mobile.getByRole("list", { name: "Orders" }).getByRole("button", { name: /#48291/ }).click();
    await mobile.getByRole("complementary", { name: "Order 48291 details" }).waitFor();
    await go(mobile, "Support inbox");
    await mobile.getByRole("complementary", { name: "JARVIS Copilot" }).waitFor();
  });
  await shot(mobile, "c06-mobile-inbox.png");
  await go(mobile, "Analytics");
  await mobile.waitForTimeout(200);
  await shot(mobile, "c10-mobile-analytics.png");
} finally {
  await browser.close();
}

for (const [s, n] of results) console.log(`${s}  ${n}`);
const failed = results.filter(([s]) => s === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
