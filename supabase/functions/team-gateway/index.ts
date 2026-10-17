// POST /functions/v1/team-gateway  — authenticated AI Executive Team (OpenRouter, free models only).
import { handleTeamGateway } from "../_shared/gateway.ts";
import { denoDeps } from "../_shared/supabase-deps.ts";

const deps = denoDeps();
Deno.serve((req) => handleTeamGateway(req, deps));
