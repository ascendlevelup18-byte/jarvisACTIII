// Web-standard (Request → Response) handlers for serverless hosts (Netlify, Vercel).
// Same ingress guard and engine as the node:http server, with two serverless rules:
// - Fixture only. If the deployment is configured for vllm, cases are refused (503)
//   rather than silently served by fixtures; there is no remote-model path here.
// - No shared business state: every case, demo or privileged, gets a fresh world.
// Limits are per serverless instance (in memory), NOT global; health says so.
import { handleCaseRequest, freshWorld } from "./ingress.ts";
import { IngressConfigError, loadIngressSecurity, LocalInferenceLimiter, type IngressLimits } from "./limits.ts";
import { FixtureModelAdapter } from "./model-adapter.ts";
import { FixtureRequestUnderstandingAdapter } from "./request-understanding.ts";

export type ServerlessDeployment = "netlify" | "vercel";

const FIXTURE_ENGINE_TIMEOUT_MS = 10_000;

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

function configuredMode(env: NodeJS.ProcessEnv): string {
  return (env.JARVIS_AI_MODE ?? "fixture").trim().toLowerCase();
}

// Platform-set client address headers (not user-controllable on these platforms).
function clientKey(request: Request, deployment: ServerlessDeployment): string {
  const h = request.headers;
  const ip = deployment === "netlify" ? h.get("x-nf-client-connection-ip") : h.get("x-real-ip");
  return ip || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function createServerlessHandlers(deployment: ServerlessDeployment, env: NodeJS.ProcessEnv = process.env) {
  let limiter: { key: string; instance: LocalInferenceLimiter } | null = null;
  const limiterFor = (limits: IngressLimits) => {
    const key = JSON.stringify(limits);
    if (limiter?.key !== key) limiter = { key, instance: new LocalInferenceLimiter(limits) };
    return limiter.instance;
  };
  const runtimeHeader = { "x-jarvis-runtime": `${deployment}-fixture-demo` };

  async function cases(request: Request): Promise<Response> {
    if (configuredMode(env) !== "fixture") {
      return json(503, { error: "serverless_is_fixture_only", detail: "real-model mode runs only on a private long-running host" }, runtimeHeader);
    }
    let security;
    try {
      security = loadIngressSecurity(env, "fixture");
    } catch (e) {
      if (e instanceof IngressConfigError) return json(503, { error: "ingress_misconfigured", detail: e.message }, runtimeHeader);
      throw e;
    }
    const clock = () => new Date();
    const r = await handleCaseRequest(
      {
        method: request.method,
        bodyText: request.method === "POST" ? await request.text() : "",
        authorization: request.headers.get("authorization") ?? undefined,
        clientKey: clientKey(request, deployment),
      },
      {
        aiMode: "fixture",
        understanding: new FixtureRequestUnderstandingAdapter(),
        model: new FixtureModelAdapter(),
        engineTimeoutMs: FIXTURE_ENGINE_TIMEOUT_MS,
        accessToken: security.accessToken,
        limiter: limiterFor(security.limits),
        privilegedWorld: () => freshWorld(clock),
        clock,
        log: (entry) => console.log("[jarvis] case:", JSON.stringify({ deployment, ...entry })),
      },
    );
    return json(r.status, r.body, { ...r.headers, ...runtimeHeader });
  }

  function health(request: Request): Response {
    if (request.method !== "GET") return json(405, { error: "method_not_allowed" });
    const fixture = configuredMode(env) === "fixture";
    return json(200, {
      ok: fixture,
      service: "jarvis",
      deployment,
      aiMode: "fixture",
      remoteModel: false,
      data: "synthetic",
      paymentGateway: "simulated",
      freeText: env.JARVIS_CASES_TOKEN?.trim() ? "token required" : "disabled",
      limits: "per serverless instance, not global",
      note: fixture
        ? "Public serverless demo: fixture AI only. Real-model (vLLM) inference runs only on a private long-running host."
        : "Misconfigured: JARVIS_AI_MODE is not fixture, so cases are refused. Serverless never serves real-model inference.",
    });
  }

  return { cases, health };
}
