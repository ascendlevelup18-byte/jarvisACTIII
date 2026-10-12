import { createServerlessHandlers } from "../apps/api/src/serverless.ts";

const { health } = createServerlessHandlers("vercel");

export function GET(request: Request): Response {
  return health(request);
}
