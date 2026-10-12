// Fake local OpenAI-compatible HTTP server for generic client tests.
// Supports scripted responses: 200, malformed JSON, hang, HTTP errors, unexpected shape, large body, text-around-JSON.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export type FakeScenario =
  | { kind: "ok"; content: string; model?: string; finishReason?: string }
  | { kind: "malformed_json" }
  | { kind: "hang" }
  | { kind: "http_status"; status: number; body?: string }
  | { kind: "unexpected_shape"; body: unknown }
  | { kind: "large"; bytes: number }
  | { kind: "text_around_json"; content: string }
  | { kind: "code_fenced"; content: string }
  | { kind: "reasoning_then_json"; content: string }
  | { kind: "echo_auth" }
  | { kind: "body_stall" };

export interface FakeOpenAIServer {
  baseUrl: string;
  port: number;
  setScenario: (s: FakeScenario) => void;
  close: () => Promise<void>;
  /** Last Authorization header value received (for secret-leak tests). */
  lastAuthorization: string | null;
}

export async function startFakeOpenAIServer(initial: FakeScenario = { kind: "ok", content: "{}" }): Promise<FakeOpenAIServer> {
  let scenario: FakeScenario = initial;
  let lastAuthorization: string | null = null;

  const server: Server = createServer((req, res) => {
    void handle(req, res);
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    lastAuthorization = req.headers.authorization ?? null;

    // Drain body so the client isn't stuck, even when we hang on respond.
    try {
      for await (const _chunk of req as AsyncIterable<Buffer>) {
        /* discard */
      }
    } catch {
      /* ignore */
    }

    const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    if (path !== "/v1/chat/completions" && path !== "/chat/completions") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    const s = scenario;

    if (s.kind === "hang") {
      // Never respond — client timeout should fire.
      return;
    }

    if (s.kind === "body_stall") {
      // Send headers and a partial body, then never finish: the body read must time out.
      res.writeHead(200, { "content-type": "application/json" });
      res.write('{"id":"stall","choices":[');
      return;
    }

    if (s.kind === "http_status") {
      res.writeHead(s.status, { "content-type": "application/json" });
      res.end(s.body ?? JSON.stringify({ error: { message: `status ${s.status}`, type: "test" } }));
      return;
    }

    if (s.kind === "malformed_json") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{not-json");
      return;
    }

    if (s.kind === "unexpected_shape") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(s.body));
      return;
    }

    if (s.kind === "large") {
      const filler = "x".repeat(Math.max(0, s.bytes - 64));
      const payload = JSON.stringify({
        id: "large",
        choices: [{ message: { role: "assistant", content: filler } }],
      });
      res.writeHead(200, {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload, "utf8"),
      });
      res.end(payload);
      return;
    }

    if (s.kind === "echo_auth") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "auth-echo",
          choices: [{ message: { role: "assistant", content: JSON.stringify({ auth: lastAuthorization }) } }],
        }),
      );
      return;
    }

    let content: string;
    if (s.kind === "text_around_json") {
      content = s.content;
    } else if (s.kind === "code_fenced") {
      content = "```json\n" + s.content + "\n```";
    } else if (s.kind === "reasoning_then_json") {
      content = "<think>internal monologue</think>\n" + s.content;
    } else {
      content = s.content;
    }

    const model = s.kind === "ok" ? (s.model ?? "fake-model") : "fake-model";
    const finishReason = s.kind === "ok" ? (s.finishReason ?? "stop") : "stop";
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "chatcmpl-fake",
        object: "chat.completion",
        model,
        choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: finishReason }],
        usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
      }),
    );
  }

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address() as AddressInfo;
  const port = addr.port;
  const baseUrl = `http://127.0.0.1:${port}/v1`;

  return {
    get baseUrl() {
      return baseUrl;
    },
    get port() {
      return port;
    },
    setScenario(s: FakeScenario) {
      scenario = s;
    },
    get lastAuthorization() {
      return lastAuthorization;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
