import { createServerlessHandlers } from "../apps/api/src/serverless.ts";

const { demoStore } = createServerlessHandlers("vercel");

export function GET(request: Request): Response {
  return demoStore(request);
}
