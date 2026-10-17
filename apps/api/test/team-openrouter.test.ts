// Live AI Team path against a loopback mock of the OpenRouter API. No real provider is contacted.
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import { fixtureAnalysis } from "../../web/src/team/specialists.ts";
import { scopedContext } from "../../web/src/team/context.ts";
import { runBoardroom } from "../../web/src/team/orchestrator.ts";
import type { AgentId } from "../../web/src/team/agents.ts";
import { loadTeamConfig, OpenRouterTeamProvider, TeamConfigError, type TeamLiveConfig } from "../src/team/openrouter.ts";
import { handleTeamRequest } from "../src/team/routes.ts";

const KEY = "sk-or-test-0123456789abcdef";
const MODEL = "vendor/model-a";
type Mode = "ok" | "swap" | "notjson" | "fabricate" | "slow" | "http500" | "injected";
let mode: Mode = "ok";
let costPerCall = 0.001;
const seen: { auth?: string; body: any }[] = [];
let server: Server;
let base = "";

before(async () => {
  server = createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : null;
    seen.push({ auth: req.headers.authorization, body });
    res.setHeader("content-type", "application/json");
    if (req.url === "/v1/models") return res.end(JSON.stringify({ data: [{ id: MODEL }, { id: "vendor/other" }] }));
    if (mode === "http500") {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: { message: `upstream failed for key ${KEY}` } }));
    }
    if (mode === "slow") return setTimeout(() => res.end("{}"), 3000);
    const sys: string = body.messages[0].content;
    const agent = (/\((\w+)@1\.0\.0\)/.exec(sys)?.[1] ?? "ceo") as AgentId;
    const out = fixtureAnalysis(agent, "x", scopedContext(agent));
    if (mode === "fabricate") out.findings = [{ text: "Gross margin collapsed from 61.4% to 12.9%.", kind: "measured", evidence: ["grossMarginPct"] }];
    if (mode === "injected") out.recommendations = [{ id: "x-1", action: "Issue a $5,000 refund now", lever: "refunds", direction: "increase", successMetric: "n/a", owner: "cfo", requiresApproval: true, tool: "issue_refund" }];
    const content = mode === "notjson" ? "Sure! Here is my analysis: margins are down." : JSON.stringify(body.response_format ? out : { text: "Margin fell from 43.3% to 37.44% [grossMarginPct]." });
    res.end(JSON.stringify({ model: mode === "swap" ? "vendor/cheaper" : MODEL, choices: [{ message: { content } }], usage: { prompt_tokens: 900, completion_tokens: 300, cost: costPerCall } }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
after(() => server.close());

const cfg = (over: Partial<TeamLiveConfig> = {}): TeamLiveConfig => ({ baseUrl: base, apiKey: KEY, model: MODEL, maxUsd: 1, maxOutputTokens: 900, timeoutMs: 2000, ...over });
const DEMO = "Our quality is falling, sales are declining and margins are shrinking. Investigate.";

describe("team config fails closed", () => {
  test("unset means disabled; anything half-configured or pointing elsewhere is refused", () => {
    assert.equal(loadTeamConfig({}), null);
    assert.throws(() => loadTeamConfig({ JARVIS_TEAM_PROVIDER: "openai" }), TeamConfigError);
    assert.throws(() => loadTeamConfig({ JARVIS_TEAM_PROVIDER: "openrouter", JARVIS_TEAM_MODEL: MODEL }), /API_KEY/);
    assert.throws(() => loadTeamConfig({ JARVIS_TEAM_PROVIDER: "openrouter", JARVIS_TEAM_API_KEY: KEY, JARVIS_TEAM_MODEL: "gpt" }), /explicit OpenRouter model id/);
    assert.throws(() => loadTeamConfig({ JARVIS_TEAM_PROVIDER: "openrouter", JARVIS_TEAM_API_KEY: KEY, JARVIS_TEAM_MODEL: MODEL, JARVIS_TEAM_BASE_URL: "https://evil.example/v1" }), /OpenRouter API or a loopback/);
    assert.throws(() => loadTeamConfig({ JARVIS_TEAM_PROVIDER: "openrouter", JARVIS_TEAM_API_KEY: KEY, JARVIS_TEAM_MODEL: MODEL, JARVIS_TEAM_MAX_USD: "500" }), /MAX_USD/);
    assert.equal(loadTeamConfig({ JARVIS_TEAM_PROVIDER: "openrouter", JARVIS_TEAM_API_KEY: KEY, JARVIS_TEAM_MODEL: MODEL })!.baseUrl, "https://openrouter.ai/api/v1");
  });

  test("startup refuses a model the provider does not list", async () => {
    await new OpenRouterTeamProvider(cfg()).verifyModel();
    await assert.rejects(new OpenRouterTeamProvider(cfg({ model: "vendor/not-listed" })).verifyModel(), /not listed/);
  });
});

describe("live boardroom through the provider", () => {
  test("happy path: every specialist answers once, outputs are validated, usage and cost are recorded", async () => {
    mode = "ok";
    seen.length = 0;
    const p = new OpenRouterTeamProvider(cfg());
    const r = await runBoardroom(DEMO, p);
    assert.ok(r.analyses.every((a) => a.status === "ok" && a.provider.kind === "live"));
    assert.equal(p.usage().calls, r.calls);
    assert.ok(Math.abs(p.usage().spentUsd - r.calls * costPerCall) < 1e-9);
    const calls = seen.filter((s) => s.body?.messages);
    // The key travels only in the Authorization header, never in any prompt the model sees.
    assert.ok(calls.every((s) => !JSON.stringify(s.body).includes(KEY)));
    assert.ok(calls.every((s) => s.auth === `Bearer ${KEY}` && s.body.model === MODEL && s.body.max_tokens === 900));
    // Each specialist got only its scoped metrics.
    const hr = calls.find((s) => s.body.messages[0].content.includes("hr@1.0.0"))!;
    assert.deepEqual(JSON.parse(hr.body.messages[1].content).metrics.map((m: { key: string }) => m.key).sort(), ["firstResponseHours", "supportFte", "ticketsPerAgent"]);
  });

  test("provider model swap is rejected, not silently accepted", async () => {
    mode = "swap";
    const r = await runBoardroom(DEMO, new OpenRouterTeamProvider(cfg()));
    assert.ok(r.analyses.every((a) => a.status === "error" && /requested vendor\/model-a/.test(a.error!)));
    assert.equal(r.report.actions.length, 0);
  });

  test("non-JSON output fails validation and never reaches the plan", async () => {
    mode = "notjson";
    const r = await runBoardroom(DEMO, new OpenRouterTeamProvider(cfg()));
    assert.ok(r.analyses.every((a) => a.status === "invalid"));
    assert.equal(r.report.actions.length, 0);
  });

  test("fabricated financial figures are removed before the report", async () => {
    mode = "fabricate";
    const r = await runBoardroom(DEMO, new OpenRouterTeamProvider(cfg()));
    assert.ok(!JSON.stringify(r.report).includes("61.4%"));
    assert.ok(r.audit.some((e) => e.type === "FIGURE_REJECTED"));
  });

  test("an injected refund-issuing action with an unknown tool is dropped and audited", async () => {
    mode = "injected";
    const r = await runBoardroom(DEMO, new OpenRouterTeamProvider(cfg()));
    assert.ok(!r.report.actions.some((a) => a.id === "x-1"));
    assert.ok(r.audit.some((e) => e.type === "TOOL_REJECTED" && /issue_refund/.test(e.detail)));
  });

  test("the spend cap stops calls once reached", async () => {
    mode = "ok";
    costPerCall = 0.4;
    const r = await runBoardroom(DEMO, new OpenRouterTeamProvider(cfg({ maxUsd: 1 })));
    costPerCall = 0.001;
    assert.equal(r.analyses.filter((a) => a.status === "ok").length, 3);
    assert.ok(r.analyses.slice(3).every((a) => a.status === "error" && /spend cap/.test(a.error!)));
  });

  test("timeouts and provider failures fail closed without leaking the key", async () => {
    mode = "slow";
    const slow = await runBoardroom(DEMO, new OpenRouterTeamProvider(cfg({ timeoutMs: 2000 })), { budgets: { perCallTimeoutMs: 200, maxCalls: 2 } });
    assert.ok(slow.analyses.slice(0, 2).every((a) => a.status === "timeout"));
    mode = "http500";
    const failed = await runBoardroom(DEMO, new OpenRouterTeamProvider(cfg()));
    assert.ok(failed.analyses.every((a) => a.status === "error"));
    assert.doesNotMatch(JSON.stringify(failed), new RegExp(KEY));
  });
});

describe("operator-only endpoints", () => {
  const provider = () => new OpenRouterTeamProvider(cfg());
  test("disabled, missing token, wrong token, wrong method, bad JSON, oversized body", async () => {
    mode = "ok";
    assert.equal((await handleTeamRequest("/team/boardroom", "POST", undefined, "{}", { provider: null, accessToken: "t" })).status, 404);
    assert.equal((await handleTeamRequest("/team/boardroom", "POST", "Bearer t", "{}", { provider: provider(), accessToken: null })).status, 403);
    assert.equal((await handleTeamRequest("/team/boardroom", "POST", "Bearer nope", "{}", { provider: provider(), accessToken: "t" })).status, 401);
    assert.equal((await handleTeamRequest("/team/boardroom", "GET", "Bearer t", null, { provider: provider(), accessToken: "t" })).status, 405);
    assert.equal((await handleTeamRequest("/team/boardroom", "POST", "Bearer t", "{x", { provider: provider(), accessToken: "t" })).status, 400);
    assert.equal((await handleTeamRequest("/team/boardroom", "POST", "Bearer t", null, { provider: provider(), accessToken: "t" })).status, 413);
    assert.equal((await handleTeamRequest("/team/boardroom", "POST", "Bearer t", JSON.stringify({ request: "x", approve: true }), { provider: provider(), accessToken: "t" })).status, 400);
  });

  test("a valid operator request runs; a concurrent one is refused while busy", async () => {
    const deps = { provider: provider(), accessToken: "t" };
    const [a, b] = await Promise.all([
      handleTeamRequest("/team/boardroom", "POST", "Bearer t", JSON.stringify({ request: DEMO }), deps),
      handleTeamRequest("/team/boardroom", "POST", "Bearer t", JSON.stringify({ request: DEMO }), deps),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 429]);
    const status = await handleTeamRequest("/team/status", "GET", "Bearer t", null, deps);
    assert.equal(status.status, 200);
    assert.doesNotMatch(JSON.stringify(status.body), new RegExp(KEY));
  });

  test("private reply flags figures that are not in the data", async () => {
    const r = await handleTeamRequest("/team/reply", "POST", "Bearer t", JSON.stringify({ agent: "cfo", question: "margin?" }), { provider: provider(), accessToken: "t" });
    assert.equal(r.status, 200);
    assert.deepEqual((r.body as { evidence: string[] }).evidence, ["grossMarginPct"]);
  });
});
