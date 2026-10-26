import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import {
  MAYA_PROTECTED_CAMPAIGN_ID,
  studioProductionTeamWorkforceV1,
} from "@/config/studio-production-team-workforce-v1";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { DESIGN_RENDERER_PROOF_SKU, resolveRenderPaths, sha256File } from "@/lib/studio-design-renderer";
import type { DesignArtifactIdentity, FlyerDesignSpec } from "@/lib/studio-design-renderer";
import { customerArtifactRootRel } from "@/lib/studio-dispatch/map-flyer-job-truth";
import { presentFlyerReviewProof } from "@/lib/studio-review-revision/present-flyer-review";

export const MAYA_FROZEN_FLYER_VERSION = studioProductionTeamWorkforceV1.mayaFrozenVersion;

export function isProductionFrozen(
  campaign: CampaignRecord | null | undefined,
  skuId: string,
): boolean {
  const freeze = campaign?.productionFreeze;
  if (!freeze || freeze.status !== "FROZEN" || freeze.doNotRemint !== true) {
    return false;
  }
  return freeze.skuIds.includes(skuId);
}

export function mayaFlyerArtifactRootRel(
  campaignId: string = MAYA_PROTECTED_CAMPAIGN_ID,
): string {
  const dispatchId = `dd:${campaignId}:v2-rtu-flyer`;
  return customerArtifactRootRel(campaignId, dispatchId);
}

export function readFrozenFlyerIdentity(input: {
  repoRoot: string;
  campaignId?: string;
  renderVersion?: number;
}): DesignArtifactIdentity | null {
  const campaignId = input.campaignId ?? MAYA_PROTECTED_CAMPAIGN_ID;
  const renderVersion = input.renderVersion ?? MAYA_FROZEN_FLYER_VERSION;
  const artifactRootRel = mayaFlyerArtifactRootRel(campaignId);
  const paths = resolveRenderPaths({ artifactRootRel, renderVersion });
  const identityAbs = path.join(input.repoRoot, paths.identityRel);
  if (!existsSync(identityAbs)) return null;
  try {
    return JSON.parse(readFileSync(identityAbs, "utf8")) as DesignArtifactIdentity;
  } catch {
    return null;
  }
}

export function readFrozenFlyerSpec(input: {
  repoRoot: string;
  campaignId?: string;
  renderVersion?: number;
}): FlyerDesignSpec | null {
  const campaignId = input.campaignId ?? MAYA_PROTECTED_CAMPAIGN_ID;
  const renderVersion = input.renderVersion ?? MAYA_FROZEN_FLYER_VERSION;
  const artifactRootRel = mayaFlyerArtifactRootRel(campaignId);
  const paths = resolveRenderPaths({ artifactRootRel, renderVersion });
  const specAbs = path.join(input.repoRoot, paths.specRel);
  if (!existsSync(specAbs)) return null;
  try {
    return JSON.parse(readFileSync(specAbs, "utf8")) as FlyerDesignSpec;
  } catch {
    return null;
  }
}

function pinObserverToFrozenIdentity(
  campaign: CampaignRecord,
  identity: DesignArtifactIdentity,
): CampaignRecord {
  const execution = campaign.dispatchExecution;
  const observer = execution?.designRendererObserver;
  if (!execution || !observer) return campaign;
  const results = observer.results.map((result) => {
    if (result.skuId !== DESIGN_RENDERER_PROOF_SKU) return result;
    return {
      ...result,
      action: "invoked" as const,
      ok: true,
      invocationOutcome: "ALREADY_RENDERED" as const,
      renderVersion: identity.renderVersion,
      pngContentSha256: identity.pngContentSha256,
      pngRelativePath: identity.pngRelativePath,
      pdfContentSha256: identity.pdfContentSha256,
      pdfRelativePath: identity.pdfRelativePath,
      receiptRelativePath: `${mayaFlyerArtifactRootRel(campaign.campaignId)}/renders/v${identity.renderVersion}/dispatch-hook-receipt.json`,
      skipReason: undefined,
      failureCode: undefined,
      message: undefined,
    };
  });
  return {
    ...campaign,
    dispatchExecution: {
      ...execution,
      designRendererObserver: {
        ...observer,
        results,
      },
    },
  };
}

export async function freezeMayaFlyerToVersion16(input: {
  repoRoot: string;
  campaign?: CampaignRecord;
}): Promise<{
  ok: boolean;
  frozen: boolean;
  campaign?: CampaignRecord;
  message: string;
  pngContentSha256?: string;
  pdfContentSha256?: string;
}> {
  const campaignId = MAYA_PROTECTED_CAMPAIGN_ID;
  const envelope = await readCampaignEnvelope(campaignId);
  const campaign = input.campaign ?? envelope?.record;
  if (!campaign) {
    return {
      ok: true,
      frozen: false,
      message: "Maya campaign is not in this workspace; freeze contract is armed.",
    };
  }

  const identity = readFrozenFlyerIdentity({
    repoRoot: input.repoRoot,
    campaignId,
    renderVersion: MAYA_FROZEN_FLYER_VERSION,
  });
  if (!identity) {
    return {
      ok: false,
      frozen: false,
      campaign,
      message: "Maya Version 16 identity is missing on disk. Freeze refused remint.",
    };
  }

  const pngAbs = path.join(input.repoRoot, identity.pngRelativePath);
  const pdfAbs = path.join(input.repoRoot, identity.pdfRelativePath);
  if (!existsSync(pngAbs) || !existsSync(pdfAbs)) {
    return {
      ok: false,
      frozen: false,
      campaign,
      message: "Maya Version 16 PNG/PDF missing. Freeze refused remint.",
    };
  }
  const pngContentSha256 = sha256File(pngAbs);
  const pdfContentSha256 = sha256File(pdfAbs);

  const frozenAt = new Date().toISOString();
  let next: CampaignRecord = {
    ...pinObserverToFrozenIdentity(campaign, identity),
    productionFreeze: {
      packageId: studioProductionTeamWorkforceV1.packageId,
      status: "FROZEN",
      reason: "OWNER_DIRECTIVE_MAYA_PARKED_VERSION_16",
      skuIds: [DESIGN_RENDERER_PROOF_SKU],
      workVersionId: `flyer-v${MAYA_FROZEN_FLYER_VERSION}`,
      renderVersion: MAYA_FROZEN_FLYER_VERSION,
      pngContentSha256,
      pdfContentSha256,
      frozenAt,
      doNotRemint: true,
    },
    updatedAt: frozenAt,
  };

  const pointerRel = `${mayaFlyerArtifactRootRel(campaignId)}/current-dispatch-hook-receipt.json`;
  const versionReceiptRel = `${mayaFlyerArtifactRootRel(campaignId)}/renders/v${MAYA_FROZEN_FLYER_VERSION}/dispatch-hook-receipt.json`;
  const versionAbs = path.join(input.repoRoot, versionReceiptRel);
  if (existsSync(versionAbs)) {
    const pointerAbs = path.join(input.repoRoot, pointerRel);
    mkdirSync(path.dirname(pointerAbs), { recursive: true });
    writeFileSync(pointerAbs, readFileSync(versionAbs, "utf8"));
  }

  const saved = await upsertCampaignRecord(next, envelope?.clientUserId);
  next = saved.record;

  const tasks = await readTasksEnvelope(campaignId);
  if (tasks) {
    const job = tasks.jobRecords?.find((entry) => entry.skuId === DESIGN_RENDERER_PROOF_SKU);
    if (job?.internalQaReviewAuthorization) {
      const pinned = {
        ...tasks,
        jobRecords: (tasks.jobRecords ?? []).map((entry) =>
          entry.skuId === DESIGN_RENDERER_PROOF_SKU
            ? {
                ...entry,
                internalQaReviewAuthorization: {
                  ...entry.internalQaReviewAuthorization!,
                  workVersionId: `flyer-v${MAYA_FROZEN_FLYER_VERSION}`,
                  contentSha256s: [pngContentSha256, pdfContentSha256],
                  artifactIds: [`flyer-v${MAYA_FROZEN_FLYER_VERSION}`],
                },
              }
            : entry,
        ),
        updatedAt: frozenAt,
      };
      const presented = await presentFlyerReviewProof({
        campaign: next,
        envelope: pinned,
        pngRelativePath: identity.pngRelativePath,
        pngContentSha256,
        pdfRelativePath: identity.pdfRelativePath,
        pdfContentSha256,
        renderVersion: MAYA_FROZEN_FLYER_VERSION,
        artifactId: `flyer-v${MAYA_FROZEN_FLYER_VERSION}`,
        forceRepresent: true,
      });
      await writeTasksEnvelope(presented.envelope);
    }
  }

  return {
    ok: true,
    frozen: true,
    campaign: next,
    message: "Maya flyer frozen at Version 16. Remint blocked.",
    pngContentSha256,
    pdfContentSha256,
  };
}

export function frozenFlyerReceiptFingerprint(): string {
  return createHash("sha256")
    .update(`maya-freeze:v${MAYA_FROZEN_FLYER_VERSION}`)
    .digest("hex");
}
