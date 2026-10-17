// One Edge Function, two routes (one deployment keeps the shared code identical for both):
//   POST .../jarvis-gateway/team          authenticated AI Executive Team (OpenRouter, free models only)
//   GET  .../jarvis-gateway/admin-health  platform admins only; booleans, never secret values
import { handleAdminHealth, handleTeamGateway } from "../_shared/gateway.ts";
import { denoDeps } from "../_shared/supabase-deps.ts";

const deps = denoDeps();
Deno.serve((req) => {
  const path = new URL(req.url).pathname;
  if (path.endsWith("/admin-health")) return handleAdminHealth(req, deps);
  if (path.endsWith("/team")) return handleTeamGateway(req, deps);
  return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json" } });
});
