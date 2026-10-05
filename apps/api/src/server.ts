// Single endpoint: POST /cases -> final case result.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { CaseRequestSchema } from "./contracts.ts";
import { runCase, type EngineDeps } from "./case-engine.ts";

const MAX_BODY_BYTES = 64 * 1024;

export function createApp(deps: EngineDeps): Server {
  return createServer((req, res) => {
    handle(req, res, deps).catch((e: unknown) => {
      console.error("[jarvis] request failed:", e);
      if (!res.headersSent) send(res, 500, { error: "internal_error" });
      else res.end();
    });
  });
}

async function handle(req: IncomingMessage, res: ServerResponse, deps: EngineDeps): Promise<void> {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  if (path !== "/cases") return send(res, 404, { error: "not_found" });
  if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size <= MAX_BODY_BYTES) chunks.push(chunk);
  }
  if (size > MAX_BODY_BYTES) return send(res, 413, { error: "body_too_large" });

  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return send(res, 400, { error: "invalid_json" });
  }
  const parsed = CaseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return send(res, 400, {
      error: "invalid_request",
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  send(res, 200, await runCase(parsed.data, deps));
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
