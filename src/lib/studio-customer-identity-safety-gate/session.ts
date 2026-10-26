import { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";

import type { CustomerIdentityDispatchSession } from "./types";

/**
 * Build the pre-dispatch boarding pass from the HTTP request.
 * Prefers the browser campaign header when present so a stale server
 * current cannot silently carry a different customer's job.
 */
export function identitySessionFromRequest(
  request: Request,
  userId: string,
  dispatchCampaignId: string,
): CustomerIdentityDispatchSession {
  const header =
    request.headers
      .get(studioCustomerIdentitySafetyGateV1.browserCampaignHeader)
      ?.trim() ?? "";
  return {
    sessionCurrentCampaignId: header || dispatchCampaignId,
    sessionClientUserId: userId,
  };
}
