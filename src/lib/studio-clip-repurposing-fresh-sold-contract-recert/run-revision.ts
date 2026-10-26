/**
 * One included Clip set revision: change the end-card CTA.
 * Does not publish. Does not change the menu.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { CLIP_REPURPOSING_PRIMARY_TOOL_ID } from "@/config/studio-clip-repurposing-launch-integration-v1";
import {
  CLIP_SOLD_RECERT_CAMPAIGN_ID,
  CLIP_SOLD_RECERT_REVISED_CTA,
  studioClipRepurposingFreshSoldContractRecertV1 as recert,
} from "@/config/studio-clip-repurposing-fresh-sold-contract-recert-v1";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { ensureClipRepurposingMachineReviewBindFromCampaign } from "@/lib/studio-customer-life/machine-clip-repurposing-review-bind";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import { reproduceClipRepurposingAfterRevision } from "@/lib/studio-review-revision/reproduce-clip-repurposing-after-revision";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";

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

export async function runClipSoldContractCtaRevision(input: { repoRoot: string }) {
  const repoRoot = input.repoRoot;
  applyDotenvLocal(repoRoot);
  const campaignId = CLIP_SOLD_RECERT_CAMPAIGN_ID;
  const proofDir = path.join(repoRoot, recert.stampDir);
  const loaded = await readCampaignEnvelope(campaignId);
  if (!loaded?.record) {
    throw new Error("Cole & Kindred campaign is missing.");
  }
  const campaign = loaded.record;
  const materials = (await readMaterialsEnvelope(campaignId))?.items ?? [];
  const dispatchRecord = readyRecord(campaignId);
  if (dispatchRecord.requirements?.primaryTool.toolId !== CLIP_REPURPOSING_PRIMARY_TOOL_ID) {
    throw new Error("Dispatch is not on clip_repurposing_pipeline.");
  }

  writeJson(path.join(proofDir, "progress.json"), {
    stage: "set-revision",
    campaignId,
    customer: recert.customerBusinessName,
    ctaText: CLIP_SOLD_RECERT_REVISED_CTA,
    at: new Date().toISOString(),
  });

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const revised = await reproduceClipRepurposingAfterRevision({
    repoRoot,
    campaign,
    dispatchRecord,
    materials,
    setRevision: {
      kind: "cta_change",
      ctaText: CLIP_SOLD_RECERT_REVISED_CTA,
    },
  });
  const remake = {
    startedAt,
    endedAt: new Date().toISOString(),
    ms: Date.now() - startedMs,
  };
  writeJson(path.join(proofDir, "revision-dispatch.json"), { ...revised, remake });
  if (!revised.ok) {
    throw new Error(`${revised.failureCode}: ${revised.message}`);
  }

  const observer = campaign.dispatchExecution?.launchMenuProductionObserver;
  const prior = observer?.results?.[0];
  const withObserver = await upsertCampaignRecord(
    {
      ...campaign,
      dispatchExecution: {
        ...campaign.dispatchExecution!,
        lastAttemptAt: new Date().toISOString(),
        launchMenuProductionObserver: {
          packageId: observer?.packageId ?? "STUDIO-OPERATING-LAUNCH-MENU-PRODUCTION-RUNTIME-1",
          observedAt: new Date().toISOString(),
          campaignId,
          results: [
            {
              dispatchId: prior?.dispatchId ?? dispatchRecord.dispatchId,
              skuId: SKU,
              action: "invoked",
              ok: true,
              invocationOutcome: revised.invocationOutcome,
              customerOutcome: revised.outcome,
              clipFiles: revised.files,
              mp4RelativePath: revised.mp4RelativePath,
              mp4ContentSha256: revised.mp4ContentSha256,
            },
          ],
        },
      },
    },
    campaign.clientUserId ?? "local-clip-sold-recert",
  );

  const bound = await ensureClipRepurposingMachineReviewBindFromCampaign(
    withObserver.record,
  );
  const proof = {
    packageId: recert.packageId,
    campaignId,
    customerBusinessName: recert.customerBusinessName,
    revisedCta: CLIP_SOLD_RECERT_REVISED_CTA,
    invocationOutcome: revised.invocationOutcome,
    fileCount: revised.files.length,
    ideas: revised.files.map((file) => file.idea),
    clipIds: revised.files.map((file) => file.clipId),
    hashes: revised.files.map((file) => file.contentSha256),
    boundCampaignName: bound.campaignName,
    remake,
    factorySpendExists: existsSync(
      path.join(
        repoRoot,
        "data/campaign-design-artifacts",
        campaignId,
        "clip-factory",
        "factory-spend.json",
      ),
    ),
  };
  writeJson(path.join(proofDir, "CTA-REVISION.json"), proof);
  return proof;
}
