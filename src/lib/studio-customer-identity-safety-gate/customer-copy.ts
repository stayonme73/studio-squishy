import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";

import { isCustomerIdentityBlocked } from "./evaluate";

export type CustomerIdentitySafetyCustomerCopy = {
  statusLabel: string;
  lead: string;
  hint: string;
};

export function resolveCustomerIdentitySafetyCustomerCopy(
  campaign: CampaignRecord | null,
): CustomerIdentitySafetyCustomerCopy | null {
  if (!isCustomerIdentityBlocked(campaign)) return null;
  const copy = studioCustomerIdentitySafetyGateV1.customerCopy;
  return {
    statusLabel: copy.statusLabel,
    lead: copy.lead,
    hint: copy.hint,
  };
}
