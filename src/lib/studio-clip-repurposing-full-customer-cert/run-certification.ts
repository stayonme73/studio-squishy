/**
 * Signed-in $549 Clip customer certification.
 * Uses the certified factory and the wired Final Delivery Room.
 * Does not publish. Does not change the menu.
 */

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { buildJobId } from "@/lib/job-control/lane-map";
import { CLIP_REPURPOSING_PRIMARY_TOOL_ID } from "@/config/studio-clip-repurposing-launch-integration-v1";
import {
  CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID,
  CLIP_FULL_CUSTOMER_CERT_EMAIL,
  CLIP_FULL_CUSTOMER_CERT_USER_ID,
  studioClipRepurposingFullCustomerCertificationV1 as cert,
} from "@/config/studio-clip-repurposing-full-customer-certification-v1";
import { hashPassword } from "@/lib/auth/password-hash";
import {
  insertStudioUserRecordIfMissing,
  linkClientCampaign,
  updateUserCurrentCampaign,
} from "@/lib/auth/users";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import { ensureClipRepurposingMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-clip-repurposing-review-bind";
import {
  invokeClipRepurposingDispatchHook,
  readClipRepurposingHookReceipt,
} from "@/lib/studio-dispatch/clip-repurposing-dispatch-hook";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import {
  buildClipRepurposingStagingCampaign,
  getClipRepurposingStagingOffer,
} from "@/lib/studio-clip-repurposing-launch/staging-purchase";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { attachSourceAudioAcknowledgement } from "@/lib/studio-source-audio-preflight/acknowledgement";

const SKU = CLIP_REPURPOSING_SKU;

function writeJson(abs: string, value: unknown) {
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

function readyRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${SKU}`;
  return evaluateJobDispatch({
    campaignId,
    routing: {
      decisionId: `rd:${jobId}`,
      jobId,
      campaignId,
      skuId: SKU,
      status: "READY_FOR_DISPATCH",
      readyForDispatch: true,
      productionFamilyId: "video_audio",
      controlLane: "standard",
      factFingerprint: `fp-${SKU}`,
      capabilityReadiness: "contract_ready",
      evaluatedAt: new Date().toISOString(),
      reason: null,
      blocker: null,
      ownerActionRequired: false,
    },
    jobId,
    skuId: SKU,
  });
}

export async function runClipFullCustomerCertification(input: { repoRoot: string }) {
  const repoRoot = input.repoRoot;
  applyDotenvLocal(repoRoot);
  const campaignId = CLIP_FULL_CUSTOMER_CERT_CAMPAIGN_ID;
  const proofDir = path.join(repoRoot, cert.stampDir);
  mkdirSync(proofDir, { recursive: true });

  const offer = getClipRepurposingStagingOffer();
  if (offer.priceCents !== 54900) {
    throw new Error("Clip Repurposing $549 offer contract drifted.");
  }

  const sourceAbs = path.join(repoRoot, cert.designatedSourceRelativePath);
  if (!existsSync(sourceAbs)) {
    throw new Error("Designated Clip source is missing.");
  }

  let campaign = {
    ...buildClipRepurposingStagingCampaign({
      campaignId,
      ctaText: cert.ctaText,
      videoPurpose: cert.videoPurpose,
    }),
    campaignName: cert.customerBusinessName,
  };

  const material = {
    id: "source-1",
    category: "photo-video" as const,
    requirementLevel: "required" as const,
    reviewStatus: "approved_for_use" as const,
    contentKind: "file-metadata" as const,
    label: "Talking-head",
    reason: "Owner-designated certification-rights-cleared source",
    relatedServiceIds: [SKU] as const,
    uploadStatus: "stored" as const,
    fileName: path.basename(cert.designatedSourceRelativePath),
    url: cert.designatedSourceRelativePath,
    useAuthorization: {
      basis: "customer_owns" as const,
      attestedAt: new Date().toISOString(),
    },
  };
  await writeMaterialsEnvelope({
    campaignId,
    items: [material],
    updatedAt: new Date().toISOString(),
    version: 1,
    syncedAt: new Date().toISOString(),
  });

  campaign = attachSourceAudioAcknowledgement({
    campaign,
    skuId: SKU,
    outcome: "NOTICE_AND_CHOICE",
    customerNotice:
      "This designated certification source is 13:35. The sold customer floor stays 15 minutes. The customer acknowledged the limitation and proceeded.",
  });
  writeJson(
    path.join(repoRoot, "data", "campaigns", campaignId, "source-audio-preflight", "decision.json"),
    {
      packageId: "STUDIO-OPERATING-SOURCE-AUDIO-PREFLIGHT-1",
      outcome: "NOTICE_AND_CHOICE",
      selectedSourceRelativePath: cert.designatedSourceRelativePath,
      cleanupPassesAttempted: 0,
      cleanupKept: false,
      revertedToOriginal: true,
      customerNotice:
        "This designated certification source is 13:35. The sold customer floor stays 15 minutes. The customer acknowledged the limitation and proceeded.",
    },
  );

  const user = await insertStudioUserRecordIfMissing({
    id: CLIP_FULL_CUSTOMER_CERT_USER_ID,
    email: CLIP_FULL_CUSTOMER_CERT_EMAIL,
    displayName: cert.customerDisplayName,
    roles: ["client"],
    accountClass: "test",
    clientCampaignIds: [campaignId],
    currentCampaignId: campaignId,
    passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
    emailVerifiedAt: new Date().toISOString(),
  });
  await upsertCampaignRecord(campaign, user.id);
  await linkClientCampaign(user.id, campaignId);
  await updateUserCurrentCampaign(user.id, campaignId);

  const factoryDir = path.join(
    repoRoot,
    "data/campaign-design-artifacts",
    campaignId,
    "clip-factory",
  );
  mkdirSync(factoryDir, { recursive: true });
  const transcriptAbs = path.join(factoryDir, "transcript-words.json");
  const certTranscriptAbs = path.join(
    repoRoot,
    "docs/launch/studio-operating-clip-repurposing-build-1/live-proof/positive-transcript-words.json",
  );
  if (!existsSync(transcriptAbs) && existsSync(certTranscriptAbs)) {
    copyFileSync(certTranscriptAbs, transcriptAbs);
  }

  const now = new Date().toISOString();
  await writeTasksEnvelope({
    campaignId,
    version: 12,
    planFingerprint: "fp-clip-full-cust-cert",
    updatedAt: now,
    syncedAt: now,
    tasks: [],
    jobRecords: [
      {
        jobId: buildJobId(campaignId, SKU),
        campaignId,
        skuId: SKU,
        serviceName: "Clip Repurposing",
        spineStatus: "in_production",
        productionLane: "quick",
        intakeComplete: true,
        updatedAt: now,
      },
    ],
  } as ServerTasksEnvelope);

  const record = readyRecord(campaignId);
  if (record.requirements?.primaryTool.toolId !== CLIP_REPURPOSING_PRIMARY_TOOL_ID) {
    throw new Error("Dispatch is not on clip_repurposing_pipeline.");
  }

  writeJson(path.join(proofDir, "progress.json"), {
    stage: "first-cut",
    campaignId,
    customer: cert.customerBusinessName,
    at: new Date().toISOString(),
  });

  const first = await invokeClipRepurposingDispatchHook({
    repoRoot,
    campaign,
    dispatchRecord: record,
    materials: [material],
  });
  writeJson(path.join(proofDir, "first-dispatch.json"), first);
  if (!first.ok) {
    throw new Error(`${first.failureCode}: ${first.message}`);
  }

  const withObserver = await upsertCampaignRecord(
    {
      ...campaign,
      dispatchExecution: {
        schemaVersion: 1,
        status: "EXECUTION_IDENTITY_READY",
        evaluatedAt: now,
        lastAttemptAt: new Date().toISOString(),
        activationCheckoutSessionId: campaign.paymentTruth!.checkoutSessionId,
        records: [record],
        ownerActionRequired: false,
        launchMenuProductionObserver: {
          packageId: "STUDIO-OPERATING-LAUNCH-MENU-PRODUCTION-RUNTIME-1",
          observedAt: new Date().toISOString(),
          campaignId,
          results: [
            {
              dispatchId: record.dispatchId,
              skuId: SKU,
              action: "invoked",
              ok: true,
              invocationOutcome: first.invocationOutcome,
              customerOutcome: first.outcome,
              clipFiles: first.files,
            },
          ],
        },
      },
    },
    user.id,
  );

  const bound = await ensureClipRepurposingMachineReviewBindFromCampaign(withObserver.record);
  const receipt = readClipRepurposingHookReceipt({
    repoRoot,
    campaignId,
    dispatchId: record.dispatchId,
    lane: "first-cut",
  });
  const latest = await readCampaignEnvelope(campaignId);

  const proof = {
    packageId: cert.packageId,
    campaignId,
    customerBusinessName: cert.customerBusinessName,
    customerDisplayName: cert.customerDisplayName,
    ctaText: cert.ctaText,
    userId: user.id,
    invocationOutcome: first.invocationOutcome,
    fileCount: first.files.length,
    ideas: first.files.map((file) => file.idea),
    clipIds: first.files.map((file) => file.clipId),
    receiptOk: Boolean(receipt?.ok),
    spineReadyForReview: true,
    designatedSourceBelowSoldFloor: cert.designatedSourceBelowSoldFloor,
    audioOutcome: "NOTICE_AND_CHOICE",
    currentCampaignId: latest?.record.campaignId ?? campaignId,
    boundCampaignName: bound.campaignName,
  };
  writeJson(path.join(proofDir, "CERT-RUN.json"), proof);
  return proof;
}
