/**
 * Bind a Machine-produced $349 footage MP4 to Review + customer communication.
 * Parallel to the stills short-video bind. Does not call that hook.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import {
  enqueueJobCommunicationRecord,
  resolveCampaignCommunicationClientId,
} from "@/lib/job-control/communication";
import { readFootageEditingHookReceipt } from "@/lib/studio-dispatch/footage-editing-dispatch-hook";
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";
import { presentFootageEditingReviewProof } from "@/lib/studio-review-revision/present-footage-editing-review";

const MACHINE_ACTIVITY_ACTOR = { role: "system" as const, displayName: "Studio Machine" };

export async function ensureFootageEditingMachineReviewBindFromCampaign(
  campaign: CampaignRecord,
): Promise<CampaignRecord> {
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
    campaignId: campaign.campaignId,
    dispatchId: result.dispatchId,
    lane: "first-cut",
  });
  const revisionReceipt = readFootageEditingHookReceipt({
    campaignId: campaign.campaignId,
    dispatchId: result.dispatchId,
    lane: "revision",
  });
  const useRevision =
    job.spineStatus === "revision_requested" && Boolean(revisionReceipt?.ok);
  const receipt = useRevision ? revisionReceipt : firstCutReceipt;
  const passed =
    (useRevision || (result.ok === true && result.action === "invoked")) &&
    Boolean(
      (useRevision ? receipt?.mp4RelativePath : result.mp4RelativePath) ||
        receipt?.mp4RelativePath,
    ) &&
    Boolean(
      (useRevision ? receipt?.mp4ContentSha256 : result.mp4ContentSha256) ||
        receipt?.mp4ContentSha256,
    );

  if (!passed) return campaign;

  const nextStatus =
    job.spineStatus === "revision_requested" ? "ready_for_review" : "ready_for_review";
  const eventType =
    job.spineStatus === "revision_requested" ? "revision_ready_again" : "ready_for_review";
  const changed = applyJobSpineStatusChange(
    job,
    envelope.jobActivityEvents ?? [],
    {
      job,
      nextStatus,
      actor: MACHINE_ACTIVITY_ACTOR,
      reason: "Frozen Short-Form Video Editing factory produced the Review MP4.",
    },
  );
  const presented = await presentFootageEditingReviewProof({
    campaign,
    envelope: {
      ...envelope,
      jobRecords: (envelope.jobRecords ?? []).map((record) =>
        record.jobId === job.jobId ? changed.job : record,
      ),
      jobActivityEvents: changed.events,
    },
    mp4RelativePath: useRevision
      ? receipt?.mp4RelativePath
      : result.mp4RelativePath ?? receipt?.mp4RelativePath,
    mp4ContentSha256: useRevision
      ? receipt?.mp4ContentSha256 ?? ""
      : result.mp4ContentSha256 ?? receipt?.mp4ContentSha256 ?? "",
    renderVersion: useRevision ? 2 : 1,
  });

  const presentedJob =
    presented.envelope.jobRecords?.find((record) => record.jobId === job.jobId) ??
    changed.job;
  const withComm = enqueueJobCommunicationRecord(
    presented.envelope,
    {
      job: presentedJob,
      campaign,
      eventType,
      clientId: resolveCampaignCommunicationClientId(
        undefined,
        campaign.campaignId,
      ),
      sender: MACHINE_ACTIVITY_ACTOR,
      idempotencyKey: `${result.dispatchId}:${useRevision ? "revision" : "first-cut"}:${receipt?.mp4ContentSha256 ?? result.mp4ContentSha256}`,
    },
  );
  await writeTasksEnvelope(withComm);
  try {
    await deliverLifecycleNoticesForCampaign(campaign.campaignId);
  } catch {
    // The review record is already saved. The next Machine pass retries the email.
  }

  const latest = await readCampaignEnvelope(campaign.campaignId);
  if (!latest?.record) return campaign;
  const saved = await upsertCampaignRecord(
    {
      ...latest.record,
      updatedAt: new Date().toISOString(),
    },
    latest.clientUserId,
  );
  return saved.record;
}
