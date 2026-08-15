import { studioPaidActivationRecoveryV1 } from "@/config/studio-paid-activation-recovery-v1";
import type { CampaignRecord } from "@/config/studio-board";

import { needsPaidOperatingRecovery } from "./needs-recovery";

export type PaidOperatingRecoveryCustomerCopy = {
  statusLabel: string;
  lead: string;
  hint: string;
};

/**
 * Customer Board copy while the paid operating chain is still recovering.
 * Do not use this when Project Intake is still the customer's honest next step —
 * incomplete intake stays the primary CTA.
 */
export function resolvePaidOperatingRecoveryCustomerCopy(
  campaign: CampaignRecord,
): PaidOperatingRecoveryCustomerCopy | null {
  if (!needsPaidOperatingRecovery(campaign)) return null;
  const copy = studioPaidActivationRecoveryV1.customerCopy;
  return {
    statusLabel: copy.recoveringStatusLabel,
    lead: copy.recoveringLead,
    hint: copy.recoveringHint,
  };
}
