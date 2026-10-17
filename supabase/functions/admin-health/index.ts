// GET /functions/v1/admin-health[?probe=models] — platform admins only; booleans, never secret values.
import { handleAdminHealth } from "../_shared/gateway.ts";
import { denoDeps } from "../_shared/supabase-deps.ts";

const deps = denoDeps();
Deno.serve((req) => handleAdminHealth(req, deps));
