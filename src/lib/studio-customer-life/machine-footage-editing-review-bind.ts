/**
 * Bind a Machine-produced $349 footage MP4 to QA → Review + customer communication.
 * Parallel to the stills short-video bind. Does not call that hook.
 */

import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import {
  hydrateCampaignDesignArtifacts,
  isHostedDurableCampaignArtifactsEnabled,
  withCampaignArtifactProductionWorkspace,
} from "@/lib/campaign-design-artifacts";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import {
  footageEditingDurableMp4Rel,
  footageEditingReceiptLane,
  readFootageEditingHookReceipt,
} from "@/lib/studio-dispatch/footage-editing-dispatch-hook";
import {
  shotstackDownloadMp4,
  shotstackPollUntilDone,
} from "@/lib/studio-kitchen-production/video-integration/client";
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";
import {
  normalizeContentSha256,
  sameContentSha256,
} from "@/lib/studio-review-revision/hash";
import { presentFootageEditingReviewProof } from "@/lib/studio-review-revision/present-footage-editing-review";

import {
  bindMachineVideoIdentityToQaRecords,
  resolveShortVideoMp4AbsolutePath,
} from "./machine-short-video-review-bind";

export async function ensureFootageEditingMachineReviewBindFromCampaign(
  campaign: CampaignRecord,
  options?: { repoRoot?: string },
): Promise<CampaignRecord> {
  if (
    !options?.repoRoot &&
    isHostedDurableCampaignArtifactsEnabled() &&
    Boolean(process.env.VERCEL)
  ) {
    return withCampaignArtifactProductionWorkspace(campaign.campaignId, (hydratedRoot) =>
      ensureFootageEditingMachineReviewBindFromCampaign(campaign, {
        repoRoot: hydratedRoot,
      }),
    );
  }

  const repoRoot = options?.repoRoot ?? process.cwd();
  const observer = campaign.dispatchExecution?.launchMenuProductionObserver;
  const result = (observer?.results ?? []).find(
    (entry) => entry.skuId === SHORT_FORM_VIDEO_EDITING_SKU,
  );
  if (!result) return campaign;

  const envelope = await readTasksEnvelope(campaign.campaignId);
  if (!envelope) return campaign;

  const job = (envelope.jobRecords ?? []).find(
    (record) => record.skuId === SHORT_FORM_VIDEO_EDITING_SKU,
  );
  if (!job) return campaign;

  const firstCutReceipt = readFootageEditingHookReceipt({
    repoRoot,
    campaignId: campaign.campaignId,
    dispatchId: result.dispatchId,
    lane: "first-cut",
  });
  const revisionReceipt = readFootageEditingHookReceipt({
    repoRoot,
    campaignId: campaign.campaignId,
    dispatchId: result.dispatchId,
    lane: "revision",
  });
  const useRevision =
    job.spineStatus === "revision_requested" && Boolean(revisionReceipt?.ok);
  const receipt = useRevision ? revisionReceipt : firstCutReceipt;
  const mp4RelativePath = useRevision
    ? receipt?.mp4RelativePath
    : result.mp4RelativePath ?? receipt?.mp4RelativePath;
  const mp4ContentSha256 = useRevision
    ? receipt?.mp4ContentSha256 ?? ""
    : result.mp4ContentSha256 ?? receipt?.mp4ContentSha256 ?? "";

  const passed =
    (useRevision || (result.ok === true && result.action === "invoked")) &&
    Boolean(mp4RelativePath) &&
    Boolean(mp4ContentSha256);

  if (!passed) return campaign;

  async function resolveProducedMp4(
    relativePath: string,
  ): Promise<ReturnType<typeof resolveShortVideoMp4AbsolutePath>> {
    let resolved = resolveShortVideoMp4AbsolutePath(relativePath);
    if (resolved) return resolved;
    if (isHostedDurableCampaignArtifactsEnabled()) {
      await hydrateCampaignDesignArtifacts(campaign.campaignId, repoRoot);
      resolved = resolveShortVideoMp4AbsolutePath(relativePath);
    }
    return resolved;
  }

  const lane = footageEditingReceiptLane(useRevision);
  const candidatePaths = [
    footageEditingDurableMp4Rel(campaign.campaignId, result.dispatchId, lane),
    mp4RelativePath,
    receipt?.mp4RelativePath,
    firstCutReceipt?.mp4RelativePath,
  ].filter(Boolean) as string[];

  let resolved: ReturnType<typeof resolveShortVideoMp4AbsolutePath> = null;
  for (const candidate of candidatePaths) {
    resolved = await resolveProducedMp4(candidate);
    if (resolved) break;
  }

  if (
    !resolved &&
    (receipt?.providerRenderId ?? result.providerRenderId) &&
    mp4ContentSha256
  ) {
    const providerRenderId =
      receipt?.providerRenderId ?? result.providerRenderId ?? "";
    const durableRel = footageEditingDurableMp4Rel(
      campaign.campaignId,
      result.dispatchId,
      lane,
    );
    const poll = await shotstackPollUntilDone(providerRenderId, {
      maxAttempts: 8,
      delayMs: 1500,
    });
    if (poll.ok && poll.status === "done" && poll.outputUrl) {
      const download = await shotstackDownloadMp4(poll.outputUrl);
      if (download.ok) {
        const hash = createHash("sha256").update(download.bytes).digest("hex");
        const expected = normalizeContentSha256(mp4ContentSha256).replace(
          /^sha256:/,
          "",
        );
        if (hash === expected) {
          const abs = path.join(repoRoot, durableRel);
          mkdirSync(path.dirname(abs), { recursive: true });
          writeFileSync(abs, download.bytes);
          resolved = resolveShortVideoMp4AbsolutePath(durableRel);
        }
      }
    }
  }

  if (!resolved) return campaign;

  const campaignEnvelope = await readCampaignEnvelope(campaign.campaignId);
  const renderVersion = useRevision ? 2 : 1;
  const artifactId = `${SHORT_FORM_VIDEO_EDITING_SKU}-v${renderVersion}`;

  const bound = bindMachineVideoIdentityToQaRecords({
    skuId: SHORT_FORM_VIDEO_EDITING_SKU,
    campaign,
    envelope,
    mp4ContentSha256,
    renderVersion,
    artifactId,
    durationSeconds: receipt?.durationSeconds,
    clientUserId: campaignEnvelope?.clientUserId,
    qaCheckId: "machine_footage_editing_identity",
  });

  let nextEnvelope = bound.envelope;
  let presented = false;
  const hashNorm = normalizeContentSha256(mp4ContentSha256);
  const hashHasQaPass = (nextEnvelope.qaRecords ?? []).some(
    (record) =>
      record.action === "qa_pass" &&
      (record.artifactBinding?.contentSha256s ?? []).some(
        (value) => sameContentSha256(value, hashNorm) || value === mp4ContentSha256,
      ),
  );

  if (bound.qaAction === "qa_pass" || hashHasQaPass) {
    const proof = await presentFootageEditingReviewProof({
      campaign,
      envelope: nextEnvelope,
      mp4RelativePath: resolved.relativePath,
      mp4AbsolutePath: resolved.absolutePath,
      mp4ContentSha256,
      renderVersion,
      artifactId,
    });
    nextEnvelope = proof.envelope;
    presented = proof.presented;
  }

  if (bound.bound || presented) {
    await writeTasksEnvelope(nextEnvelope);
    try {
      await deliverLifecycleNoticesForCampaign(campaign.campaignId);
    } catch {
      // Review record is saved; a later pass retries email.
    }
  }

  const latest = await readCampaignEnvelope(campaign.campaignId);
  if (!latest?.record) return campaign;

  const boundJob = nextEnvelope.jobRecords?.find(
    (record) => record.skuId === SHORT_FORM_VIDEO_EDITING_SKU,
  );
  let record = latest.record;
  if (
    boundJob?.spineStatus === "ready_for_review" &&
    boundJob.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW" &&
    record.campaignStatus !== "READY_FOR_REVIEW" &&
    record.campaignStatus !== "DELIVERED"
  ) {
    const saved = await upsertCampaignRecord(
      {
        ...record,
        campaignStatus: "READY_FOR_REVIEW",
        updatedAt: new Date().toISOString(),
      },
      latest.clientUserId,
    );
    record = saved.record;
  }

  const saved = await upsertCampaignRecord(
    {
      ...record,
      updatedAt: new Date().toISOString(),
    },
    latest.clientUserId,
  );
  return saved.record;
}
