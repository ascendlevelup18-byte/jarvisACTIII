// Vercel function (Web handler signature): public fixture demo. Shared logic in
// apps/api/src/serverless.ts (same guard and engine as Netlify and the node server).
import { createServerlessHandlers } from "../apps/api/src/serverless.ts";

const { cases } = createServerlessHandlers("vercel");

export function POST(request: Request): Promise<Response> {
  return cases(request);
}

export function GET(request: Request): Promise<Response> {
  return cases(request); // answers 405
}
