// Post-deploy security test of the live jarvis-gateway Edge Function and the database's REST surface.
// Sends no provider request: every spending route must refuse before inference (route flags off, no
// model selected, or wrong role). Uses only the project's public URL and publishable (anon) key, plus
// three disposable test users created for the run and deleted afterwards.
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SMOKE_USERS='{"a":["email","pw"],"b":[...],"v":[...]}' node scripts/cloud-smoke.mjs
const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const users = JSON.parse(process.env.SMOKE_USERS ?? "{}");
if (!URL_ || !ANON || !users.a) throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY and SMOKE_USERS are required");
const FN = `${URL_}/functions/v1/jarvis-gateway`;
const results = [];
const check = (name, ok, detail = "") => results.push({ ok: !!ok, name, detail });
const SECRET = /sk-or-v1-|rc-[0-9a-f]{20,}|service_role|SUPABASE_SERVICE/i;

async function signIn([email, password]) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json();
  if (!j.access_token) throw new Error(`sign-in failed for a test user: ${r.status}`);
  return { jwt: j.access_token, id: j.user.id };
}
const rest = (jwt, path, init = {}) => fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { apikey: ANON, authorization: `Bearer ${jwt}`, "content-type": "application/json", ...(init.headers ?? {}) } });
const rpc = async (jwt, fn, args) => {
  const r = await rest(jwt, `rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const gw = async (path, jwt, body, extra = {}) => {
  const r = await fetch(`${FN}${path}`, { method: body === undefined ? "GET" : "POST", headers: { ...(jwt ? { authorization: `Bearer ${jwt}` } : {}), apikey: ANON, "content-type": "application/json", ...extra }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await r.text();
  return { status: r.status, text, body: (() => { try { return JSON.parse(text); } catch { return null; } })() };
};

const A = await signIn(users.a);
const B = await signIn(users.b);
const V = await signIn(users.v);
const orgA = (await rpc(A.jwt, "create_organization", { p_name: "Smoke org A" })).body;
const orgB = (await rpc(B.jwt, "create_organization", { p_name: "Smoke org B" })).body;
await rpc(A.jwt, "set_member_role", { p_org: orgA, p_user: V.id, p_role: "viewer" });
check("setup: two orgs created through the RPC", typeof orgA === "string" && typeof orgB === "string");

// --- authentication
check("no Authorization header → 401", (await gw("/status", null, { orgId: orgA })).status === 401);
check("anon key used as a user token → 401", (await gw("/status", ANON, { orgId: orgA })).status === 401);
const forged = `${A.jwt.split(".").slice(0, 2).join(".")}.${"x".repeat(43)}`;
check("forged signature → 401", (await gw("/status", forged, { orgId: orgA })).status === 401);
check("garbage token → 401", (await gw("/status", "not-a-jwt", { orgId: orgA })).status === 401);
check("disallowed browser origin → 403", (await gw("/status", A.jwt, { orgId: orgA }, { origin: "https://evil.example" })).status === 403);

// --- authorization and isolation on the gateway
const sv = await gw("/status", V.jwt, { orgId: orgA });
check("viewer reads own org status", sv.status === 200 && sv.body?.role === "viewer", `${sv.status}`);
check("status reveals no secret", !SECRET.test(sv.text));
const so = await gw("/status", A.jwt, { orgId: orgA });
check("owner gets their own role (owner), not another member's", so.status === 200 && so.body?.role === "owner", so.text);
check("other org's owner cannot read org A status → 403", (await gw("/status", B.jwt, { orgId: orgA })).status === 403);
check("viewer cannot run a case → 403", (await gw("/cases", V.jwt, { orgId: orgA, request: { customerId: "CUST-1001", orderId: "48291", message: "I was charged twice for order #48291." } })).status === 403);
check("other org cannot run a case in org A → 403", (await gw("/cases", B.jwt, { orgId: orgA, request: { customerId: "CUST-1001", orderId: "48291", message: "I was charged twice for order #48291." } })).status === 403);
check("viewer cannot use the team → 403", (await gw("/team", V.jwt, { op: "reply", orgId: orgA, agent: "cfo", question: "q" })).status === 403);
check("extra body field (approve) → 400", (await gw("/team", A.jwt, { op: "reply", orgId: orgA, agent: "cfo", question: "q", approve: true })).status === 400);
check("request cannot name a model → 400", (await gw("/cases", A.jwt, { orgId: orgA, model: "x/y", request: { customerId: "CUST-1001", orderId: "48291", message: "x" } })).status === 400);
check("platform-admin health refused for an org owner → 403", (await gw("/admin-health", A.jwt)).status === 403);

// --- inference stays off until separately enabled
const c = await gw("/cases", A.jwt, { orgId: orgA, request: { customerId: "CUST-1001", orderId: "48291", message: "I was charged twice for order #48291." } });
check("owner's case refused before any model call (route off or model not selected)", c.status === 503 && /amd_route_not_enabled|case_model_not_selected|amd_not_configured/.test(c.text), c.text);
const t1 = await gw("/team", A.jwt, { op: "reply", orgId: orgA, agent: "cfo", question: "q" });
check("team refused before selection", t1.status === 503, t1.text);
const sel = await rpc(V.jwt, "select_model", { p_org: orgA, p_purpose: "team", p_registry_id: "or-nemotron-3-super-free" });
check("viewer cannot select a model", sel.status >= 400, `${sel.status}`);
const sel2 = await rpc(A.jwt, "select_model", { p_org: orgA, p_purpose: "team", p_registry_id: "or-nemotron-3-super-free" });
check("owner selects a registry model", sel2.status === 200 || sel2.status === 204, `${sel2.status}`);
const t2 = await gw("/team", A.jwt, { op: "reply", orgId: orgA, agent: "cfo", question: "q" });
check("team still refused: live inference not enabled or key not configured", t2.status === 503 && /live_inference_not_enabled|team_not_configured/.test(t2.text), t2.text);
check("no gateway response contains a secret", ![sv, c, t1, t2].some((r) => SECRET.test(r.text)));

// --- database RLS through the public REST API
const bCases = await (await rest(B.jwt, `cases?org_id=eq.${orgA}&select=id`)).json();
check("other org reads no cases of org A", Array.isArray(bCases) && bCases.length === 0);
const bOrgs = await (await rest(B.jwt, `organizations?id=eq.${orgA}&select=id`)).json();
check("other org cannot see org A", Array.isArray(bOrgs) && bOrgs.length === 0);
const anonOrgs = await rest(ANON, "organizations?select=id");
check("anonymous REST read of organizations is refused", anonOrgs.status === 401 || anonOrgs.status === 403, `${anonOrgs.status}`);
const promote = await rest(V.jwt, `memberships?user_id=eq.${V.id}`, { method: "PATCH", body: JSON.stringify({ role: "owner" }) });
check("viewer cannot promote self through REST", promote.status >= 400 || (await (await rest(A.jwt, `memberships?user_id=eq.${V.id}&select=role`)).json())[0]?.role === "viewer", `${promote.status}`);
const audit = await rest(A.jwt, "audit_events", { method: "POST", body: JSON.stringify({ org_id: orgA, actor_kind: "user", operation: "forged" }) });
check("owner cannot write audit rows directly", audit.status >= 400, `${audit.status}`);
const refund = await rpc(A.jwt, "execute_approved_refund", { p_proposal: "00000000-0000-0000-0000-000000000000" });
check("refund execution without an approved proposal is refused", refund.status >= 400, `${refund.status}`);

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail && !r.ok ? `  —  ${r.detail.slice(0, 160)}` : ""}`);
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} deployed-gateway checks passed`);
console.log(JSON.stringify({ orgA, orgB }));
process.exit(passed === results.length ? 0 : 1);
