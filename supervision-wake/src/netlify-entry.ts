import {
  handleWakeRequest,
  SUPERVISION_WAKE_PROVIDER_RATE_LIMIT,
} from "../../src/lib/studio-work-supervision/wake-http";

export default async function wake(request: Request): Promise<Response> {
  return handleWakeRequest(request);
}

export const config = {
  path: "/*",
  rateLimit: { ...SUPERVISION_WAKE_PROVIDER_RATE_LIMIT },
};
