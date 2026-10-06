export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      service: "jarvis",
      deployment: "netlify",
      aiMode: "fixture",
      data: "synthetic",
      paymentGateway: "simulated",
      remoteModel: false,
      note: "Pre-kickoff public demo. Real AMD/vLLM adapters are intentionally not implemented in this build.",
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
