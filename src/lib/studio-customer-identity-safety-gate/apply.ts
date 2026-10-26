import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";
import { studioDispatchV1 } from "@/config/studio-dispatch-v1";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import type { DispatchExecutionRecord } from "@/lib/studio-dispatch/types";

import type { CustomerIdentitySafetyFail } from "./types";

const RECOVERY_DIR = path.join(process.cwd(), "data", "machine-recovery");
const RECOVERY_LOG = path.join(RECOVERY_DIR, "customer-identity-mismatch.jsonl");

export type CustomerIdentitySafetyRecord = {
  packageId: typeof studioCustomerIdentitySafetyGateV1.packageId;
  status: "blocked";
  blocker: typeof studioCustomerIdentitySafetyGateV1.blockerCode;
  mismatchKind: CustomerIdentitySafetyFail["mismatchKind"];
  recoveryPath: typeof studioCustomerIdentitySafetyGateV1.recoveryPath;
  ownerActionRequired: false;
  expectedCampaignId: string;
  foundCampaignId: string | null;
  evaluatedAt: string;
};

function blockedDispatch(
  campaign: CampaignRecord,
  verdict: CustomerIdentitySafetyFail,
  now: string,
): DispatchExecutionRecord {
  return {
    schemaVersion: studioDispatchV1.schemaVersion,
    status: studioDispatchV1.envelopeStatuses.identityBlocked,
    evaluatedAt: campaign.dispatchExecution?.evaluatedAt ?? now,
    lastAttemptAt: now,
    activationCheckoutSessionId:
      campaign.paymentTruth?.checkoutSessionId ??
      campaign.dispatchExecution?.activationCheckoutSessionId ??
      "",
    records: (campaign.dispatchExecution?.records ?? []).map((record) => ({
      ...record,
      status: studioDispatchV1.outcomes.waitingForPrerequisite,
      executionIdentityReady: false,
      blocker: studioCustomerIdentitySafetyGateV1.blockerCode,
      reason: studioCustomerIdentitySafetyGateV1.customerCopy.lead,
    })),
    ownerActionRequired: false,
    lastError: `${verdict.blocker}:${verdict.mismatchKind}`,
    customerIdentitySafety: {
      packageId: studioCustomerIdentitySafetyGateV1.packageId,
      status: "blocked",
      blocker: verdict.blocker,
      mismatchKind: verdict.mismatchKind,
      recoveryPath: verdict.recoveryPath,
      ownerActionRequired: false,
      expectedCampaignId: verdict.expectedCampaignId,
      foundCampaignId: verdict.foundCampaignId,
      evaluatedAt: now,
    },
  };
}

export async function recordCustomerIdentityMismatchRecovery(
  campaign: CampaignRecord,
  verdict: CustomerIdentitySafetyFail,
): Promise<void> {
  const payload = {
    at: new Date().toISOString(),
    packageId: studioCustomerIdentitySafetyGateV1.packageId,
    blocker: verdict.blocker,
    mismatchKind: verdict.mismatchKind,
    recoveryPath: verdict.recoveryPath,
    ownerActionRequired: false,
    dispatchCampaignId: campaign.campaignId,
    expectedCampaignId: verdict.expectedCampaignId,
    foundCampaignId: verdict.foundCampaignId,
    details: verdict.details,
  };
  console.error("[CUSTOMER_CONTEXT_MISMATCH]", payload);
  try {
    await fs.mkdir(RECOVERY_DIR, { recursive: true });
    await fs.appendFile(RECOVERY_LOG, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (error) {
    console.error("[CUSTOMER_CONTEXT_MISMATCH] recovery log write failed", error);
  }
}

/**
 * Persist a safe waiting state on the dispatch campaign only.
 * Never writes the frozen Maya envelope. Never remints artifacts.
 */
export async function applyCustomerIdentityFailClosed(
  campaign: CampaignRecord,
  verdict: CustomerIdentitySafetyFail,
): Promise<CampaignRecord> {
  await recordCustomerIdentityMismatchRecovery(campaign, verdict);
  if (campaign.campaignId === MAYA_PROTECTED_CAMPAIGN_ID) {
    const now = new Date().toISOString();
    return {
      ...campaign,
      dispatchExecution: blockedDispatch(campaign, verdict, now),
    };
  }

  const now = new Date().toISOString();
  const envelope = await readCampaignEnvelope(campaign.campaignId);
  const saved = await upsertCampaignRecord(
    {
      ...campaign,
      dispatchExecution: blockedDispatch(campaign, verdict, now),
      updatedAt: now,
    },
    envelope?.clientUserId,
  );
  return saved.record;
}
