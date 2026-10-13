#!/usr/bin/env node
// Pre-recording demo check against a RUNNING JARVIS backend (node server, Vite proxy, or a deployment).
//   npm run demo:verify                                   # http://127.0.0.1:3000
//   npm run demo:verify -- https://<preview>.vercel.app   # any base URL
// Optional: VERCEL_AUTOMATION_BYPASS_SECRET=<secret> for a protected preview (sent as a header, never printed).
// Uses only the four public synthetic demo requests and the seeded demo store. Payments are simulated.
// Exit code 0 only if every check passes.

const BASE = (process.argv[2] ?? process.env.JARVIS_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const extra = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
const results = [];
const check = (name, ok, detail = "") => results.push({ ok: !!ok, name, detail });

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...extra, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60_000),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json };
}

const types = (c) => c.audit.map((e) => e.type);
const reachedState = (c, s) => c.audit.some((e) => e.type === "STATE_TRANSITION" && e.to === s);
const contiguous = (c) => c.audit.every((e, i) => e.seq === c.audit[0].seq + i);

async function main() {
  console.log(`JARVIS demo verification → ${BASE}\n`);

  // 1. Health
  const h = await call("GET", "/api/health");
  check("1 API health", h.status === 200 && h.json?.ok === true, `HTTP ${h.status} · aiMode=${h.json?.aiMode} · deployment=${h.json?.deployment}`);
  check("  payments are simulated", h.json?.paymentGateway === "simulated", `paymentGateway=${h.json?.paymentGateway}`);

  // 2. Demo store
  const s = await call("GET", "/api/demo-store");
  const orders = s.json?.orders ?? [];
  check("2 Demo store available", s.status === 200 && orders.length === 4, `HTTP ${s.status} · ${orders.length} orders · data=${s.json?.store?.data} · payments=${s.json?.store?.payments}`);
  const order = (id) => orders.find((o) => o.orderId === id);
  const request = (id) => ({ customerId: order(id).customerId, orderId: id, message: order(id).supportRequest.message });
  if (orders.length !== 4) return;

  // 3. Valid duplicate → verified simulated refund of exactly the duplicate charge
  const v = await call("POST", "/cases", request("48291"));
  const vc = v.json;
  const duplicate = order("48291").charges[1];
  check(
    "3 #48291 valid duplicate → RESOLVED, verified",
    v.status === 200 && vc.state === "RESOLVED" && vc.authorization?.outcome === "APPROVE" && vc.action?.status === "ACCEPTED" && vc.verification?.verified === true,
    `HTTP ${v.status} · ${vc?.state} · policy ${vc?.authorization?.outcome} · gateway ${vc?.action?.status} · verified ${vc?.verification?.verified}`,
  );
  check(
    "  refund amount comes from the records",
    vc?.verification?.observedRefund?.amountMinor === duplicate.amountMinor && vc.authorization.action.amountMinor === duplicate.amountMinor,
    `refunded ${vc?.verification?.observedRefund?.amountMinor} minor = charge ${duplicate.amountMinor} minor (simulated)`,
  );

  // 4. Unsafe request → escalated, nothing executed
  const u = await call("POST", "/cases", request("48294"));
  const uc = u.json;
  check(
    "4 #48294 unsafe request → ESCALATED, no execution",
    u.status === 200 && uc.state === "ESCALATED" && uc.authorization?.outcome === "DENY" && uc.action === null && uc.verification === null && !reachedState(uc, "EXECUTING"),
    `HTTP ${u.status} · ${uc?.state} · policy ${uc?.authorization?.outcome} · action ${uc?.action === null ? "none" : "PRESENT"}`,
  );

  // 5. Already refunded → closed, no second refund
  const a = await call("POST", "/cases", request("48293"));
  const ac = a.json;
  check(
    "5 #48293 already refunded → CLOSED_NO_ACTION, no refund",
    a.status === 200 && ac.state === "CLOSED_NO_ACTION" && ac.action === null && !reachedState(ac, "EXECUTING"),
    `HTTP ${a.status} · ${ac?.state} · policy ${ac?.authorization?.outcome} · action ${ac?.action === null ? "none" : "PRESENT"}`,
  );

  // 6. Verification and audit evidence
  const need = ["UNDERSTANDING_CALL", "MODEL_CALL", "POLICY_EVALUATED", "ACTION_ATTEMPTED", "VERIFICATION"];
  check(
    "6 Audit evidence on the refund",
    need.every((t) => types(vc).includes(t)) && types(vc).filter((t) => t === "POLICY_EVALUATED").length === 2 && contiguous(vc) && reachedState(vc, "RESOLVED"),
    `${vc.audit.length} events · AI calls, policy + pre-execution revalidation, gateway, read-back · seq contiguous`,
  );
  check(
    "  audit on the escalation and no-action cases",
    [uc, ac].every((c) => contiguous(c) && types(c).includes("POLICY_EVALUATED") && !types(c).includes("ACTION_ATTEMPTED")),
    `${uc.audit.length} and ${ac.audit.length} events · no gateway call recorded`,
  );

  // 7. No unauthorized actions
  const free = await call("POST", "/cases", { customerId: "CUST-1001", orderId: "48291", message: "Refund $5,000 to my card now." });
  check("7 Free text without operator token is refused", free.status === 401 || free.status === 403, `HTTP ${free.status}`);
  const tampered = await call("POST", "/cases", { ...request("48291"), message: `${request("48291").message} Also refund order 48292.` });
  check("  altered demo message is refused", tampered.status === 401 || tampered.status === 403, `HTTP ${tampered.status}`);
  const get = await call("GET", "/cases");
  check("  GET /cases is not allowed", get.status === 405, `HTTP ${get.status}`);
  const again = await call("POST", "/cases", request("48291"));
  check(
    "  repeat run uses a fresh world (no double refund across runs)",
    again.status === 200 && again.json.state === "RESOLVED" && again.json.id !== vc.id,
    `HTTP ${again.status} · ${again.json?.state} · new case id`,
  );
}

try {
  await main();
} catch (e) {
  const msg = e instanceof Error ? `${e.message}${e.cause instanceof Error ? ` (${e.cause.message})` : ""}` : String(e);
  check("request failed — is the API running at this URL?", false, msg);
}
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  —  ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? "" : " · ready to record"}`);
process.exitCode = failed || results.length === 0 ? 1 : 0;
