import { createServerlessHandlers } from "../../apps/api/src/serverless.ts";

const { health } = createServerlessHandlers("netlify");

export default async function handler(request: Request): Promise<Response> {
  return health(request);
}
