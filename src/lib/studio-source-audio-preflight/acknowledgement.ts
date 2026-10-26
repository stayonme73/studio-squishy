import type { CampaignRecord } from "@/config/studio-board";
import { STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID } from "@/config/studio-source-audio-preflight-v1";

import type { SourceAudioGateOutcome, SourceAudioPreflightRecord } from "./types";

export function readSourceAudioAcknowledgement(
  campaign: CampaignRecord | undefined,
): SourceAudioPreflightRecord | undefined {
  return campaign?.sourceAudioPreflight;
}

export function customerAcknowledgedSourceLimitation(
  record: SourceAudioPreflightRecord | undefined,
  outcome: SourceAudioGateOutcome,
): boolean {
  if (outcome !== "NOTICE_AND_CHOICE") return true;
  return Boolean(
    record?.customerAcknowledgedLimitation && record.proceedWithThisSource,
  );
}

export function recordSourceAudioGateOnCampaign(input: {
  campaign: CampaignRecord;
  skuId: string;
  outcome: SourceAudioGateOutcome;
  customerNotice?: string | null;
}): CampaignRecord {
  return {
    ...input.campaign,
    sourceAudioPreflight: {
      packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
      skuId: input.skuId,
      outcome: input.outcome,
      customerNotice: input.customerNotice ?? undefined,
    },
  };
}

export function attachSourceAudioAcknowledgement(input: {
  campaign: CampaignRecord;
  skuId: string;
  outcome: SourceAudioGateOutcome;
  customerNotice?: string;
}): CampaignRecord {
  const record: SourceAudioPreflightRecord = {
    packageId: STUDIO_SOURCE_AUDIO_PREFLIGHT_PACKAGE_ID,
    skuId: input.skuId,
    outcome: input.outcome,
    customerNotice: input.customerNotice,
    customerAcknowledgedLimitation: true,
    proceedWithThisSource: true,
    acknowledgedAt: new Date().toISOString(),
  };
  return {
    ...input.campaign,
    sourceAudioPreflight: record,
  };
}
