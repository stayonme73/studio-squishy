/**
 * Machine customer-identity safety gate.
 * Before Production dispatch, records must resolve to one active customer project.
 *
 * Authority: STUDIO-OPERATING-MACHINE-CUSTOMER-IDENTITY-SAFETY-GATE-1
 * Fail closed. Do not guess. Do not prefer the older paid campaign.
 * Do not silently overwrite. Owner/Scout do not operate routine mismatches.
 *
 * Future chain of custody (same invariant, later handoffs):
 * payment → campaign → intake → materials → review artifact → Final Delivery.
 */

import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";

export const studioCustomerIdentitySafetyGateV1 = {
  packageId: "STUDIO-OPERATING-MACHINE-CUSTOMER-IDENTITY-SAFETY-GATE-1",
  schemaVersion: 1 as const,
  blockerCode: "CUSTOMER_CONTEXT_MISMATCH" as const,
  recoveryPath: "engineering_system_recovery" as const,
  ownerActionRequired: false as const,
  scoutOperatesCustomerJob: false as const,
  doNotGuessCustomer: true as const,
  doNotPreferOlderPaidCampaign: true as const,
  doNotSilentlyOverwrite: true as const,
  doNotRemint: true as const,
  protectedFrozenCampaignId: MAYA_PROTECTED_CAMPAIGN_ID,
  /** Browser boarding-pass header. Not customer-facing copy. */
  browserCampaignHeader: "x-studio-browser-campaign-id" as const,
  customerCopy: {
    statusLabel: "Verifying your project",
    lead: "We're verifying your project information before production begins. Nothing is required from you right now.",
    hint: "Your Studio Board will update when the next honest step is ready.",
  },
} as const;
