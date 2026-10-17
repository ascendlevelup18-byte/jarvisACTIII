// Cloud AI gateway (supabase/functions/_shared/gateway.ts) against fakes for Supabase and a loopback
// mock of the OpenRouter API. No real provider or database is contacted.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";
import { fixtureAnalysis } from "../../web/src/team/specialists.ts";
import { scopedContext } from "../../web/src/team/context.ts";
import type { AgentId } from "../../web/src/team/agents.ts";
import { handleAdminHealth, handleTeamGateway, resetGatewayCache, type GatewayDeps, type Role } from "../../../supabase/functions/_shared/gateway.ts";

const KEY = "sk-or-v1-" + "ab".repeat(32);
const MODEL = "vendor/model-a:free";
const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";
let base = "";
let server: Server;
let completions = 0;

before(async () => {
  server = createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    res.setHeader("content-type", "application/json");
    if (req.url === "/v1/models") return res.end(JSON.stringify({ data: [{ id: MODEL, pricing: { prompt: "0", completion: "0" } }] }));
    if (req.url === "/v1/key") return res.end(JSON.stringify({ data: { limit: 0, limit_remaining: 0, usage: 0, is_free_tier: true } }));
    completions++;
    const body = JSON.parse(raw);
    const agent = (/\((\w+)@1\.0\.0\)/.exec(body.messages[0].content)?.[1] ?? "ceo") as AgentId;
    const content = body.response_format ? JSON.stringify(fixtureAnalysis(agent, "x", scopedContext(agent))) : "Gross margin fell to 37.44% [grossMarginPct]. It will reach 80% by spring.";
    res.end(JSON.stringify({ model: body.model, choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0 } }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
after(() => server.close());

interface World {
  users: Record<string, string>; // jwt -> user id
  roles: Record<string, Role>; // `${user}:${org}` -> role
  quota: number;
  log: string[];
  rows: { table: string; as: string; row: Record<string, unknown> }[];
}
let w: World;
beforeEach(() => {
  resetGatewayCache();
  completions = 0;
  w = { users: { "jwt-owner": "u-owner", "jwt-viewer": "u-viewer", "jwt-other": "u-other" }, roles: { [`u-owner:${ORG}`]: "owner", [`u-viewer:${ORG}`]: "viewer", [`u-other:${OTHER_ORG}`]: "owner" }, quota: 10, log: [], rows: [] };
});

const env = (over: Record<string, string | undefined> = {}) => ({
  JARVIS_TEAM_PROVIDER: "openrouter", JARVIS_TEAM_API_KEY: KEY, JARVIS_TEAM_MODEL: MODEL, JARVIS_TEAM_BASE_URL: base,
  JARVIS_TEAM_LIVE_ENABLED: "1", JARVIS_ALLOWED_ORIGINS: "https://jarvis.example", ...over,
});

const deps = (e = env()): GatewayDeps & { isPlatformAdmin(u: string): Promise<boolean> } => ({
  env: e,
  fetch,
  getUser: async (jwt) => (w.users[jwt] ? { id: w.users[jwt]! } : null),
  roleOf: async (jwt, org) => w.roles[`${w.users[jwt]}:${org}`] ?? null,
  rpcAsUser: async (jwt, fn, args) => {
    w.log.push(`user:${w.users[jwt]}:${fn}`);
    if (fn === "reserve_model_request") {
      if (w.roles[`${w.users[jwt]}:${args.p_org}`] === undefined) throw new Error("FORBIDDEN");
      if (w.quota <= 0) throw new Error("QUOTA_EXHAUSTED");
      w.quota--;
      return `req-${w.quota}`;
    }
    return null;
  },
  rpcAsService: async (fn, args) => void w.log.push(`service:${fn}:${args.p_status}`),
  insertAsService: async (table, row) => (w.rows.push({ table, as: "service", row }), { id: "x" }),
  insertAsUser: async (jwt, table, row) => void w.rows.push({ table, as: w.users[jwt]!, row }),
  conversation: async (_jwt, _org, _user, kind, agent) => `${kind}:${agent ?? "board"}`,
  isPlatformAdmin: async (u) => u === "u-owner",
});

const post = (body: unknown, jwt = "jwt-owner", origin: string | null = "https://jarvis.example") =>
  new Request("https://fn.example/team-gateway", { method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json", ...(origin ? { origin } : {}) }, body: typeof body === "string" ? body : JSON.stringify(body) });

describe("gateway access control", () => {
  test("foreign origins, missing or invalid tokens, bad bodies and wrong methods are refused", async () => {
    assert.equal((await handleTeamGateway(post({}, "jwt-owner", "https://evil.example"), deps())).status, 403);
    assert.equal((await handleTeamGateway(new Request("https://fn.example", { method: "OPTIONS", headers: { origin: "https://jarvis.example" } }), deps())).status, 204);
    assert.equal((await handleTeamGateway(new Request("https://fn.example", { method: "GET", headers: { origin: "https://jarvis.example" } }), deps())).status, 405);
    assert.equal((await handleTeamGateway(new Request("https://fn.example", { method: "POST" }), deps())).status, 401);
    assert.equal((await handleTeamGateway(post({ op: "reply" }, "jwt-forged"), deps())).status, 401);
    assert.equal((await handleTeamGateway(post("{x"), deps())).status, 400);
    assert.equal((await handleTeamGateway(post({ op: "reply", orgId: ORG, agent: "cfo", question: "q", approve: true }), deps())).status, 400);
    assert.equal((await handleTeamGateway(post({ op: "reply", orgId: ORG, agent: "cfo", question: "x".repeat(17000) }), deps())).status, 413);
    assert.equal(completions, 0);
  });

  test("viewers and members of other orgs are refused before any provider call, and the denial is logged", async () => {
    assert.equal((await handleTeamGateway(post({ op: "reply", orgId: ORG, agent: "cfo", question: "q" }, "jwt-viewer"), deps())).status, 403);
    assert.equal((await handleTeamGateway(post({ op: "reply", orgId: ORG, agent: "cfo", question: "q" }, "jwt-other"), deps())).status, 403);
    assert.equal(completions, 0);
    assert.equal(w.rows.filter((r) => r.table === "security_events").length, 2);
  });

  test("configured secrets alone do not enable spending; misconfiguration fails closed", async () => {
    const q = { op: "reply", orgId: ORG, agent: "cfo", question: "q" };
    assert.equal((await handleTeamGateway(post(q), deps(env({ JARVIS_TEAM_LIVE_ENABLED: undefined })))).status, 503);
    assert.equal((await handleTeamGateway(post(q), deps(env({ JARVIS_TEAM_PROVIDER: undefined })))).status, 503);
    const paid = await handleTeamGateway(post(q), deps(env({ JARVIS_TEAM_MODEL: "vendor/model-a" })));
    assert.equal(paid.status, 503);
    assert.deepEqual(await paid.json(), { error: "team_misconfigured" });
    assert.equal(completions, 0);
  });
});

describe("gateway live path", () => {
  test("private reply: quota reserved as the caller, completed by the service, unverified figure withheld, no key in the response", async () => {
    const res = await handleTeamGateway(post({ op: "reply", orgId: ORG, agent: "cfo", question: "Why is margin down?" }), deps());
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.doesNotMatch(text, new RegExp(KEY));
    const body = JSON.parse(text);
    assert.equal(body.withheld, 1);
    assert.doesNotMatch(body.text, /80%/);
    assert.deepEqual(w.log, ["user:u-owner:reserve_model_request", "service:complete_model_request:completed"]);
    const human = w.rows.find((r) => r.table === "messages" && r.row.author_kind === "human")!;
    assert.equal(human.as, "u-owner"); // written under the caller's identity, not the service role
    const ai = w.rows.find((r) => r.table === "messages" && r.row.author_kind === "ai")!;
    assert.deepEqual(ai.row.provenance, { kind: "live", provider: "openrouter", model: MODEL });
  });

  test("durable quota exhausted: no provider request is sent", async () => {
    w.quota = 0;
    const res = await handleTeamGateway(post({ op: "reply", orgId: ORG, agent: "cfo", question: "q" }), deps());
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: "QUOTA_EXHAUSTED" });
    assert.equal(completions, 0);
  });

  test("boardroom: at most six calls, each reserved, AI messages and an audit event stored", async () => {
    w.quota = 4;
    const res = await handleTeamGateway(post({ op: "boardroom", orgId: ORG, request: "Margins are falling. Investigate.", agents: ["cfo", "sales", "cmo", "coo", "hr", "ceo"] }), deps());
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(completions, 4);
    assert.equal(body.analyses.filter((a: { status: string }) => a.status === "ok").length, 4);
    assert.ok(body.analyses.slice(4).every((a: { error?: string }) => /durable quota exhausted/.test(a.error ?? "")));
    assert.equal(w.rows.filter((r) => r.table === "messages" && r.as === "service").length, 4);
    assert.equal(w.rows.filter((r) => r.table === "audit_events").length, 1);
  });
});

describe("admin health", () => {
  test("admins get booleans only; others are refused; no secret value is returned", async () => {
    const req = (jwt: string) => new Request("https://fn.example/admin-health", { headers: { authorization: `Bearer ${jwt}`, origin: "https://jarvis.example" } });
    assert.equal((await handleAdminHealth(req("jwt-viewer"), deps())).status, 403);
    const res = await handleAdminHealth(req("jwt-owner"), deps(env({ JARVIS_MODEL_API_KEY: "rc-" + "0".repeat(48) })));
    const text = await res.text();
    assert.equal(res.status, 200);
    assert.doesNotMatch(text, /sk-or|rc-0/);
    const b = JSON.parse(text);
    assert.equal(b.openRouterCredentialConfigured, true);
    assert.equal(b.amdCredentialConfigured, true);
    assert.equal(b.amdRouteEnabled, false);
    assert.equal(b.securityGate, "pass");
  });
});

test("edge copies of the team modules match their sources", () => {
  execFileSync(process.execPath, ["scripts/sync-edge-shared.mjs", "--check"], { cwd: new URL("../../../", import.meta.url) });
});
