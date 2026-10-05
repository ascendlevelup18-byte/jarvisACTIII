import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { CaseInputSchema } from "./contracts.ts";
import { processCase, type Deps } from "./pipeline.ts";

const MAX_BODY_BYTES = 64 * 1024;

export interface ServerInfo {
  autoRefundEnabled: boolean;
}

export function createApp(deps: Deps, info: ServerInfo): Server {
  return createServer((req, res) => {
    handle(req, res, deps, info).catch((e: unknown) => {
      console.error("[jarvis] unhandled request error:", e);
      if (!res.headersSent) send(res, 500, { error: "internal_error" });
      else res.end();
    });
  });
}

async function handle(req: IncomingMessage, res: ServerResponse, deps: Deps, info: ServerInfo): Promise<void> {
  const path = new URL(req.url ?? "/", "http://localhost").pathname.replace(/\/+$/, "") || "/";
  const method = req.method ?? "GET";

  if (method === "GET" && path === "/health") {
    return send(res, 200, { ok: true, llm: deps.llm.name, autoRefundEnabled: info.autoRefundEnabled });
  }

  if (path === "/cases") {
    if (method === "GET") {
      const cases = deps.cases.list().map((c) => ({
        id: c.id,
        customerId: c.customerId,
        state: c.state,
        createdAt: c.createdAt,
        reasons: c.escalation?.reasons.map((r) => r.code) ?? [],
      }));
      return send(res, 200, { cases });
    }
    if (method === "POST") {
      const body = await readJson(req);
      if (body.kind === "too_large") return send(res, 413, { error: "body_too_large" });
      if (body.kind === "invalid") return send(res, 400, { error: "invalid_json" });
      const input = CaseInputSchema.safeParse(body.value);
      if (!input.success) {
        return send(res, 400, {
          error: "invalid_input",
          issues: input.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      }
      return send(res, 201, await processCase(input.data, deps));
    }
    return send(res, 405, { error: "method_not_allowed" });
  }

  const m = /^\/cases\/([A-Za-z0-9_-]+)(\/audit)?$/.exec(path);
  if (m && method === "GET") {
    const c = deps.cases.get(m[1]!);
    if (!c) return send(res, 404, { error: "case_not_found" });
    return send(res, 200, m[2] ? { events: deps.audit.forCase(c.id) } : c);
  }

  return send(res, 404, { error: "not_found" });
}

type Body = { kind: "ok"; value: unknown } | { kind: "invalid" } | { kind: "too_large" };

async function readJson(req: IncomingMessage): Promise<Body> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size <= MAX_BODY_BYTES) chunks.push(chunk as Buffer); // keep draining past the limit, then reject
  }
  if (size > MAX_BODY_BYTES) return { kind: "too_large" };
  try {
    return { kind: "ok", value: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { kind: "invalid" };
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
