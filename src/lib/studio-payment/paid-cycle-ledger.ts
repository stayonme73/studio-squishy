import { randomUUID } from "crypto";

import type { CampaignRecord } from "@/config/studio-board";
import { studioPaidCyclePaymentV1 } from "@/config/studio-paid-cycle-payment-v1";

import type { PaidCyclePurchaseRecord } from "./paid-cycle-types";

export function mintPaidCyclePurchaseId(): string {
  return `pcp_${randomUUID().replace(/-/g, "")}`;
}

export function listPaidCyclePurchases(
  campaign: CampaignRecord,
): readonly PaidCyclePurchaseRecord[] {
  return campaign.paidCyclePurchases ?? [];
}

export function findPaidCyclePurchase(
  campaign: CampaignRecord,
  paidCyclePurchaseId: string,
): PaidCyclePurchaseRecord | null {
  return (
    listPaidCyclePurchases(campaign).find(
      (row) => row.paidCyclePurchaseId === paidCyclePurchaseId,
    ) ?? null
  );
}

export function findPaidCyclePurchaseBySession(
  campaign: CampaignRecord,
  checkoutSessionId: string,
): PaidCyclePurchaseRecord | null {
  return (
    listPaidCyclePurchases(campaign).find(
      (row) => row.checkoutSessionId === checkoutSessionId,
    ) ?? null
  );
}

/** True when this purchase already has processor-confirmed authority. */
export function isPaidCyclePurchaseConfirmed(
  campaign: CampaignRecord,
  paidCyclePurchaseId: string,
): boolean {
  const row = findPaidCyclePurchase(campaign, paidCyclePurchaseId);
  return row?.status === "confirmed";
}

/**
 * Campaign-level paymentTruth alone must never authorize a future cycle.
 * Only a confirmed ledger row for this paidCyclePurchaseId authorizes.
 */
export function campaignPaidAloneAuthorizesCycle(
  _campaign: CampaignRecord,
): false {
  return false;
}

export function upsertPaidCyclePurchase(
  campaign: CampaignRecord,
  record: PaidCyclePurchaseRecord,
): CampaignRecord {
  const prior = listPaidCyclePurchases(campaign);
  const index = prior.findIndex(
    (row) => row.paidCyclePurchaseId === record.paidCyclePurchaseId,
  );
  const next =
    index >= 0
      ? prior.map((row, i) => (i === index ? record : row))
      : [...prior, record];
  return {
    ...campaign,
    paidCyclePurchases: next,
    updatedAt: record.confirmedAt ?? record.initiatedAt ?? campaign.updatedAt,
  };
}

export function assertPaidCycleSku(
  skuId: string,
): skuId is typeof studioPaidCyclePaymentV1.skuId {
  return skuId === studioPaidCyclePaymentV1.skuId;
}
