import { CaseRequestSchema } from "../../apps/api/src/contracts.ts";
import { runCase, type EngineDeps } from "../../apps/api/src/case-engine.ts";
import { CommerceStore, REFUND_POLICY, seedFixtures } from "../../apps/api/src/fixtures.ts";
import { SimulatedPaymentGateway } from "../../apps/api/src/gateway.ts";
import { FixtureModelAdapter } from "../../apps/api/src/model-adapter.ts";
import { FixtureRequestUnderstandingAdapter } from "../../apps/api/src/request-understanding.ts";

const MAX_BODY_BYTES = 64 * 1024;

function buildFixtureDeps(): EngineDeps {
  const clock = () => new Date();
  const store = new CommerceStore();
  seedFixtures(store, clock());

  return {
    store,
    gateway: new SimulatedPaymentGateway(store, clock),
    understanding: new FixtureRequestUnderstandingAdapter(),
    model: new FixtureModelAdapter(),
    policy: REFUND_POLICY,
    permissions: { autoRefund: true },
    clock,
    modelTimeoutMs: 10_000,
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-jarvis-runtime": "netlify-fixture-demo",
    },
  });
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return json(413, { error: "body_too_large" });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const parsed = CaseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, {
      error: "invalid_request",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  // Public pre-kickoff demo: each request runs in an isolated synthetic sandbox.
  // Core case-engine / policy / execution / verification logic is unchanged.
  // This avoids cross-visitor mutation while keeping the demo deterministic.
  const result = await runCase(parsed.data, buildFixtureDeps());
  return json(200, result);
}
