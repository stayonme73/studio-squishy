import type { CampaignRecord } from "@/config/studio-board";

export type PaidOperatingRecoveryReason =
  | "payment_not_confirmed"
  | "already_clear"
  | "recovered"
  | "still_pending";

export type PaidOperatingRecoveryResult = {
  ok: boolean;
  recovered: boolean;
  needsRecovery: boolean;
  alreadyClear: boolean;
  ownerActionRequired: false;
  campaign: CampaignRecord;
  reason: PaidOperatingRecoveryReason;
  lastError?: string | null;
  attempts: number;
};

export type PaidOperatingSweepResult = {
  attempted: number;
  recovered: number;
  stillPending: number;
  skippedClear: number;
  ownerActionRequired: false;
  campaignIds: readonly string[];
};
