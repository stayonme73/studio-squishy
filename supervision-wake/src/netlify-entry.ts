import { handleWakeRequest } from "../../src/lib/studio-work-supervision/wake-http";

export default async function wake(request: Request): Promise<Response> {
  return handleWakeRequest(request);
}

export const config = {
  path: "/*",
  rateLimit: {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
