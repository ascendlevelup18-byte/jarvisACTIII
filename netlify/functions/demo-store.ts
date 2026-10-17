import { createServerlessHandlers } from "../../apps/api/src/serverless.ts";

const { demoStore } = createServerlessHandlers("netlify");

export default async function handler(request: Request): Promise<Response> {
  return demoStore(request);
}
