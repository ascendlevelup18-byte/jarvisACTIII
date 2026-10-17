// JARVIS cloud AI gateway, runtime-neutral (Deno Edge Functions in production, Node in tests).
//
// Every request: CORS allowlist → POST only → size limit → Supabase JWT verified → strict body → caller must be
// owner or operator of the org (read under RLS with the caller's own JWT, never from the body) → live inference
// must be explicitly enabled → every provider call reserves durable quota first (atomic SQL function, as the
// caller) and is completed by the service role whatever happens. Provider keys are read from function secrets
// only and never appear in a response, a log line or the database.
import { z } from "zod";
import { runBoardroom } from "./jarvis/web/src/team/orchestrator.ts";
import { scopedContext } from "./jarvis/web/src/team/context.ts";
import { loadTeamConfig, OpenRouterTeamProvider, type DispatchHooks } from "./jarvis/api/src/team/openrouter.ts";

export const MAX_BODY_BYTES = 16 * 1024;
const PER_OPERATION_MAX_CALLS = 6;

export type Role = "owner" | "operator" | "viewer";

export interface GatewayDeps {
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  /** Verifies the JWT with Supabase Auth; null when invalid or expired. */
  getUser(jwt: string): Promise<{ id: string } | null>;
  /** The caller's role in the org, read with the caller's JWT under row-level security. */
  roleOf(jwt: string, orgId: string): Promise<Role | null>;
  /** Calls a SQL function as the caller (RLS and auth.uid() apply). Throws Error(message) on failure. */
  rpcAsUser(jwt: string, fn: string, args: Record<string, unknown>): Promise<unknown>;
  /** Calls a SQL function with the service role (server-only functions such as complete_model_request). */
  rpcAsService(fn: string, args: Record<string, unknown>): Promise<unknown>;
  /** Inserts with the service role (AI messages, audit and security events). */
  insertAsService(table: string, row: Record<string, unknown>): Promise<{ id?: string } | null>;
  /** Finds or creates the caller's private conversation with one specialist, or the org boardroom, as the caller. */
  conversation(jwt: string, orgId: string, userId: string, kind: "private" | "boardroom", agent: string | null): Promise<string>;
  insertAsUser(jwt: string, table: string, row: Record<string, unknown>): Promise<void>;
}

const agentId = z.enum(["ceo", "cfo", "sales", "cmo", "coo", "hr"]);
const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("reply"), orgId: z.string().uuid(), agent: agentId, question: z.string().trim().min(1).max(1200) }).strict(),
  z.object({ op: z.literal("boardroom"), orgId: z.string().uuid(), request: z.string().trim().min(1).max(2000), agents: z.array(agentId).min(1).max(6).optional() }).strict(),
]);

function json(status: number, body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...cors } });
}

export function corsFor(origin: string | null, env: Record<string, string | undefined>): Record<string, string> | null {
  if (origin === null) return {}; // server-to-server or same-origin tools: no CORS headers needed
  const allowed = (env.JARVIS_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return null;
  return { "access-control-allow-origin": origin, vary: "Origin", "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "access-control-allow-methods": "POST, OPTIONS" };
}

const codeOf = (e: unknown) => {
  const c = (e as { code?: unknown })?.code;
  return typeof c === "string" && /^[A-Z_]+$/.test(c) ? c : "PROVIDER_ERROR";
};

let verified: { model: string; at: number } | null = null; // cold-start cache of the startup gate
export const resetGatewayCache = () => void (verified = null);

export async function handleTeamGateway(req: Request, deps: GatewayDeps): Promise<Response> {
  const cors = corsFor(req.headers.get("origin"), deps.env);
  if (cors === null) return json(403, { error: "origin_not_allowed" }, {});
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, cors);

  const jwt = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!jwt) return json(401, { error: "unauthorized" }, cors);
  const user = await deps.getUser(jwt).catch(() => null);
  if (!user) return json(401, { error: "unauthorized" }, cors);

  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(413, { error: "body_too_large" }, cors);
  let parsed: z.infer<typeof Body>;
  try {
    const p = Body.safeParse(JSON.parse(raw));
    if (!p.success) return json(400, { error: "invalid_request" }, cors);
    parsed = p.data;
  } catch {
    return json(400, { error: "invalid_json" }, cors);
  }

  const role = await deps.roleOf(jwt, parsed.orgId).catch(() => null);
  if (role !== "owner" && role !== "operator") {
    await deps.insertAsService("security_events", { org_id: role ? parsed.orgId : null, user_id: user.id, kind: "team_gateway_denied", detail: { op: parsed.op, role } }).catch(() => null);
    return json(403, { error: "forbidden" }, cors);
  }

  let cfg;
  try {
    cfg = loadTeamConfig({ ...deps.env, JARVIS_TEAM_MAX_REQUESTS: String(PER_OPERATION_MAX_CALLS), JARVIS_TEAM_FREE_ONLY: deps.env.JARVIS_TEAM_FREE_ONLY ?? "1" });
  } catch {
    return json(503, { error: "team_misconfigured" }, cors);
  }
  if (!cfg) return json(503, { error: "team_not_configured" }, cors);
  // Configuring the secrets is not consent to spend: live calls need this flag set separately by the owner.
  if (deps.env.JARVIS_TEAM_LIVE_ENABLED !== "1") return json(503, { error: "live_inference_not_enabled" }, cors);

  const operation = parsed.op === "reply" ? "team_reply" : "team_boardroom";
  const hooks: DispatchHooks = {
    reserve: async () => String(await deps.rpcAsUser(jwt, "reserve_model_request", { p_org: parsed.orgId, p_provider: "openrouter", p_model: cfg!.model, p_operation: operation })),
    complete: async (ticket, o) => {
      await deps.rpcAsService("complete_model_request", { p_request: ticket, p_status: o.status, p_tokens_in: o.tokensIn, p_tokens_out: o.tokensOut, p_cost: o.costUsd, p_error: o.error });
    },
  };
  const provider = new OpenRouterTeamProvider(cfg, deps.fetch, hooks);
  try {
    if (!verified || verified.model !== cfg.model || Date.now() - verified.at > 10 * 60_000) {
      await provider.verifyModel(); // listing + zero price + key limit; no inference
      verified = { model: cfg.model, at: Date.now() };
    }
  } catch (e) {
    return json(503, { error: codeOf(e) }, cors);
  }

  const provenance = { kind: "live", provider: "openrouter", model: cfg.model };
  if (parsed.op === "reply") {
    const conv = await deps.conversation(jwt, parsed.orgId, user.id, "private", parsed.agent);
    await deps.insertAsUser(jwt, "messages", { conversation_id: conv, org_id: parsed.orgId, author_kind: "human", author_user_id: user.id, text: parsed.question });
    try {
      const r = await provider.reply(parsed.agent, parsed.question, scopedContext(parsed.agent), AbortSignal.timeout(60_000));
      await deps.insertAsService("messages", { conversation_id: conv, org_id: parsed.orgId, author_kind: "ai", agent: parsed.agent, provenance, text: r.text.slice(0, 4000), withheld_statements: r.withheld });
      return json(200, { text: r.text, evidence: r.evidence, withheld: r.withheld, provider: r.provider, usage: provider.usage() }, cors);
    } catch (e) {
      return json(502, { error: codeOf(e) }, cors);
    }
  }

  const result = await runBoardroom(parsed.request, provider, { agents: parsed.agents, budgets: { maxCalls: PER_OPERATION_MAX_CALLS, perCallTimeoutMs: 60_000 } });
  const board = await deps.conversation(jwt, parsed.orgId, user.id, "boardroom", null);
  for (const a of result.analyses) {
    if (a.status !== "ok" || !a.output) continue;
    const text = a.output.findings.map((f) => `${f.kind === "measured" ? "Measured" : "Hypothesis"}: ${f.text}`).join("\n").slice(0, 4000);
    await deps.insertAsService("messages", { conversation_id: board, org_id: parsed.orgId, author_kind: "ai", agent: a.agent, provenance, text });
  }
  await deps.insertAsService("audit_events", {
    org_id: parsed.orgId, actor_kind: "user", actor_id: user.id, operation: "team.boardroom", provider: "openrouter", model: cfg.model,
    execution_result: result.analyses.every((a) => a.status === "ok") ? "all_ok" : "partial",
    detail: { selected: result.selected, statuses: result.analyses.map((a) => [a.agent, a.status]), actions: result.report.actions.length, figureRejections: result.audit.filter((e) => e.type === "FIGURE_REJECTED").length },
  });
  return json(200, { ...result, usage: provider.usage() }, cors);
}

/** Platform-admin health check. Reports only booleans and public facts; never a key or any part of one. */
export async function handleAdminHealth(req: Request, deps: Pick<GatewayDeps, "env" | "fetch" | "getUser"> & { isPlatformAdmin(userId: string): Promise<boolean> }): Promise<Response> {
  const cors = corsFor(req.headers.get("origin"), deps.env);
  if (cors === null) return json(403, { error: "origin_not_allowed" }, {});
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const jwt = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "")?.[1];
  const user = jwt ? await deps.getUser(jwt).catch(() => null) : null;
  if (!user || !(await deps.isPlatformAdmin(user.id).catch(() => false))) return json(403, { error: "forbidden" }, cors);
  const e = deps.env;
  const set = (k: string) => typeof e[k] === "string" && e[k]!.trim().length > 0;
  let teamConfig: "ok" | "missing" | "invalid" = "missing";
  try {
    teamConfig = loadTeamConfig(e) ? "ok" : "missing";
  } catch {
    teamConfig = "invalid";
  }
  const body: Record<string, unknown> = {
    amdCredentialConfigured: set("JARVIS_MODEL_API_KEY"),
    amdBaseUrlConfigured: set("JARVIS_MODEL_BASE_URL"),
    openRouterCredentialConfigured: set("JARVIS_TEAM_API_KEY"),
    teamModel: set("JARVIS_TEAM_MODEL") ? e.JARVIS_TEAM_MODEL : null,
    teamConfig,
    teamLiveEnabled: e.JARVIS_TEAM_LIVE_ENABLED === "1",
    amdRouteEnabled: false, // the AMD key was exposed; no cloud route uses it in this release
    allowedOrigins: (e.JARVIS_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean).length,
    auth: "pass",
  };
  // Public model listing only (no key sent): is the configured model listed, and at a zero price?
  if (new URL(req.url).searchParams.get("probe") === "models" && teamConfig === "ok") {
    try {
      const res = await deps.fetch("https://openrouter.ai/api/v1/models", { signal: AbortSignal.timeout(10_000) });
      const list = ((await res.json()) as { data?: { id: string; pricing?: Record<string, string> }[] }).data ?? [];
      const m = list.find((x) => x.id === e.JARVIS_TEAM_MODEL);
      body.teamModelListed = Boolean(m);
      body.teamModelFree = Boolean(m && Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0);
    } catch {
      body.teamModelListed = "unreachable";
    }
  }
  body.securityGate = body.auth === "pass" && (teamConfig === "ok" || teamConfig === "missing") && body.allowedOrigins !== 0 ? "pass" : "fail";
  return json(200, body, cors);
}
