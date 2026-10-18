// Public fixture demo on Netlify. All logic (access guard, limits, fresh world per case,
// unchanged engine) lives in apps/api/src/serverless.ts, shared with Vercel.
import { createServerlessHandlers } from "../../apps/api/src/serverless.ts";

const { cases } = createServerlessHandlers("netlify");

export default async function handler(request: Request): Promise<Response> {
  return cases(request);
}
