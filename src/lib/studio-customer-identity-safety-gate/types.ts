import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";

export type CustomerIdentityMismatchKind =
  | "stale_campaign_pointer"
  | "customer_identity_mismatch"
  | "payment_campaign_mismatch"
  | "intake_campaign_mismatch"
  | "materials_campaign_mismatch"
  | "job_packet_campaign_mismatch"
  | "sku_payment_mismatch"
  | "frozen_customer_in_active_context";

export type CustomerIdentityDispatchSession = {
  sessionCurrentCampaignId?: string | null;
  sessionClientUserId?: string | null;
  /** Test/injected Intake association when it is not the campaign document itself. */
  intakeCampaignId?: string | null;
  /** Test/injected job-packet campaign ids. */
  jobPacketCampaignIds?: readonly string[];
};

export type CustomerIdentitySafetyContext = {
  activeCampaignId: string;
  campaign: CampaignRecord;
  clientUserId?: string | null;
  sessionCurrentCampaignId?: string | null;
  sessionClientUserId?: string | null;
  paymentBindingCampaignId?: string | null;
  paymentPayerClientUserId?: string | null;
  paymentSelectedServiceIds?: readonly string[] | null;
  intakeCampaignId?: string | null;
  materialsCampaignId?: string | null;
  materialsCertificationCampaignIds?: readonly string[];
  jobPacketCampaignIds?: readonly string[];
  frozenProtectedCampaignId?: string;
};

export type CustomerIdentitySafetyPass = {
  ok: true;
  blocker: null;
};

export type CustomerIdentitySafetyFail = {
  ok: false;
  blocker: typeof studioCustomerIdentitySafetyGateV1.blockerCode;
  mismatchKind: CustomerIdentityMismatchKind;
  recoveryPath: typeof studioCustomerIdentitySafetyGateV1.recoveryPath;
  ownerActionRequired: false;
  expectedCampaignId: string;
  foundCampaignId: string | null;
  details: string;
};

export type CustomerIdentitySafetyVerdict =
  | CustomerIdentitySafetyPass
  | CustomerIdentitySafetyFail;
