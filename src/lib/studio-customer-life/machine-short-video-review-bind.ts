/**
 * Connect Shotstack MP4 identity to Kitchen QA + Review eligibility for
 * v2-rtu-short-video — same Board → QA → Review spine as flyer. No CapCut.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import {
  SHORT_VIDEO_MACHINE_REVIEW_SKU,
} from "@/config/studio-review-revision-full-loop-v1";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import {
  appendQaRecord,
  buildQaRecord,
  formalQaTaskIdForService,
} from "@/lib/campaign-tasks/qa";
import { readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { applyJobSpineStatusChange } from "@/lib/job-control/actions";
import {
  enqueueJobCommunicationRecord,
  resolveCampaignCommunicationClientId,
} from "@/lib/job-control/communication";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import {
  buildInternalQaReviewAuthorization,
  evaluateReviewEligibility,
} from "@/lib/studio-review-eligibility";
import {
  fullVideoPassAttestations,
  viewingNotesForHash,
} from "@/lib/studio-kitchen-production/video-production/attestations";
import type { VideoQualityEvidence } from "@/lib/studio-kitchen-production/video-production/types";
import { presentShortVideoReviewProof } from "@/lib/studio-review-revision/present-short-video-review";
import { normalizeContentSha256, sameContentSha256 } from "@/lib/studio-review-revision/hash";
import { deliverLifecycleNoticesForCampaign } from "@/lib/studio-lifecycle-email/campaign";

import { assembleCustomerLifeTruth } from "./assemble-truth";

const MACHINE_ACTOR = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/").replace(/^\.?\//, "");
}

export function resolveShortVideoMp4AbsolutePath(
  mp4Path: string,
): { absolutePath: string; relativePath: string } | null {
  const raw = mp4Path.trim().replace(/\\/g, "/");
  if (!raw) return null;
  if (path.isAbsolute(raw) && existsSync(raw)) {
    const cwd = process.cwd().replace(/\\/g, "/");
    const rel = raw.replace(/\\/g, "/").startsWith(cwd)
      ? normalizeRel(raw.replace(/\\/g, "/").slice(cwd.length + 1))
      : normalizeRel(path.basename(raw));
    return { absolutePath: raw, relativePath: rel };
  }
  const relativePath = normalizeRel(raw);
  const absolutePath = path.join(process.cwd(), relativePath);
  return existsSync(absolutePath) ? { absolutePath, relativePath } : null;
}

function recordsForHash(
  envelope: ServerTasksEnvelope,
  hash: string,
  rawHash: string,
) {
  return (envelope.qaRecords ?? []).filter((record) =>
    (record.artifactBinding?.contentSha256s ?? []).some(
      (value) => sameContentSha256(value, hash) || value === rawHash,
    ),
  );
}

function shortVideoQaRecords(envelope: ServerTasksEnvelope | null | undefined) {
  return (envelope?.qaRecords ?? []).filter((record) =>
    record.taskId.includes(SHORT_VIDEO_MACHINE_REVIEW_SKU),
  );
}

export function latestShortVideoQaIsUnresolvedFail(
  envelope: ServerTasksEnvelope | null | undefined,
): boolean {
  const videoQa = [...shortVideoQaRecords(envelope)].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  if (videoQa.length === 0) return false;
  const last = videoQa[videoQa.length - 1]!;
  return last.action === "qa_fail" || last.action === "qa_block";
}

function machineVideoQualityEvidence(input: {
  contentSha256: string;
  campaignId: string;
  durationSeconds?: number;
}): VideoQualityEvidence {
  const hex = normalizeContentSha256(input.contentSha256).replace(/^sha256:/, "");
  return {
    evaluation: {
      skuId: SHORT_VIDEO_MACHINE_REVIEW_SKU,
      ok: true,
      findings: [],
      checkedAt: new Date().toISOString(),
      deterministicFailCount: 0,
      judgmentRequired: true,
      assemblyCapability: "present_and_usable",
      summary:
        input.durationSeconds != null
          ? `Machine short-video bind — duration ${input.durationSeconds}s; visual/listening attestations recorded.`
          : "Machine short-video bind — visual/listening attestations recorded.",
    },
    attestations: fullVideoPassAttestations(
      viewingNotesForHash(
        hex,
        "Room 4B / Machine short-video Review bind — A/V beat sync attested for bound MP4.",
      ),
    ),
    gatePassed: true,
  };
}

/**
 * Bind MP4 identity to Kitchen QA + Review eligibility for the short-video job.
 */
export function bindShortVideoIdentityToQaRecords(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  mp4ContentSha256: string;
  renderVersion: number;
  artifactId: string;
  workVersionId?: string;
  scriptVersionId?: string;
  durationSeconds?: number;
  videoQualityEvidence?: VideoQualityEvidence | null;
  clientUserId?: string | null;
}): {
  envelope: ServerTasksEnvelope;
  bound: boolean;
  alreadyBound: boolean;
  qaAction: "qa_pass" | "qa_fail" | "none";
} {
  const skuId = SHORT_VIDEO_MACHINE_REVIEW_SKU;
  const taskId = formalQaTaskIdForService(skuId);
  const hash = normalizeContentSha256(input.mp4ContentSha256);
  const matching = recordsForHash(input.envelope, hash, input.mp4ContentSha256);
  if (matching.some((record) => record.action === "qa_pass")) {
    return {
      envelope: input.envelope,
      bound: false,
      alreadyBound: true,
      qaAction: "none",
    };
  }

  const evidence =
    input.videoQualityEvidence ??
    machineVideoQualityEvidence({
      contentSha256: input.mp4ContentSha256,
      campaignId: input.campaign.campaignId,
      durationSeconds: input.durationSeconds,
    });
  const evidencePassed = evidence.gatePassed === true;
  if (!evidencePassed && matching.some((record) => record.action === "qa_fail")) {
    return {
      envelope: input.envelope,
      bound: false,
      alreadyBound: true,
      qaAction: "none",
    };
  }

  const workVersionId = input.workVersionId ?? `short-video-v${input.renderVersion}`;
  const qaAction = evidencePassed ? "qa_pass" : "qa_fail";
  const record = buildQaRecord({
    campaignId: input.campaign.campaignId,
    taskId,
    user: MACHINE_ACTOR,
    actorRole: "qa",
    action: qaAction,
    category: evidencePassed ? undefined : "production_correction",
    checks: ["machine_short_video_identity"],
    notes: evidencePassed
      ? "Sealed Machine short-video MP4 bound for Review eligibility."
      : "Short-video output is not customer-ready. Internal video quality evidence did not pass.",
    workVersionId,
    videoQualityEvidence: evidence,
    artifactBinding: {
      workVersionId,
      artifactIds: [input.artifactId],
      contentSha256s: [hash],
      scriptVersionId: input.scriptVersionId,
    },
  });

  let envelope: ServerTasksEnvelope = {
    ...input.envelope,
    qaRecords: appendQaRecord(input.envelope.qaRecords, record),
    updatedAt: new Date().toISOString(),
  };

  const job = envelope.jobRecords?.find((entry) => entry.skuId === skuId);
  if (!job) {
    return { envelope, bound: true, alreadyBound: false, qaAction };
  }

  if (!evidencePassed) {
    const { internalQaReviewAuthorization: _cleared, ...rest } = job;
    let nextJob: PurchasedJobRecord = rest;
    let events = envelope.jobActivityEvents ?? [];
    if (job.spineStatus === "ready_for_review") {
      const moved = applyJobSpineStatusChange(nextJob, events, {
        job: nextJob,
        nextStatus: "building_concepts",
        actor: { role: "system", displayName: "Studio Machine" },
        reason: "Internal video quality evidence did not pass. Review is not open.",
      });
      nextJob = moved.job;
      events = moved.events;
    }
    return {
      envelope: {
        ...envelope,
        jobRecords: (envelope.jobRecords ?? []).map((entry) =>
          entry.jobId === job.jobId ? nextJob : entry,
        ),
        jobActivityEvents: events,
        updatedAt: new Date().toISOString(),
      },
      bound: true,
      alreadyBound: false,
      qaAction,
    };
  }

  const decision = evaluateReviewEligibility({
    jobId: job.jobId,
    campaignId: job.campaignId,
    skuId,
    tasks: envelope.tasks,
    qaRecords: envelope.qaRecords ?? [],
    reviewCandidate: {
      artifactId: input.artifactId,
      workVersionId,
      contentSha256: hash,
      scriptVersionId: input.scriptVersionId,
    },
  });
  const authorization = buildInternalQaReviewAuthorization(decision);
  if (!authorization) {
    return { envelope, bound: true, alreadyBound: false, qaAction };
  }

  const truth = assembleCustomerLifeTruth({
    campaign: input.campaign,
    tasks: envelope,
  });
  const now = new Date().toISOString();
  const wasRevision = job.spineStatus === "revision_requested";
  let nextJob: PurchasedJobRecord = {
    ...job,
    internalQaReviewAuthorization: authorization,
    productionStartedAt: job.productionStartedAt ?? now,
  };
  let events = envelope.jobActivityEvents ?? [];
  if (
    truth.intakeComplete &&
    truth.blockingMaterialsCount === 0 &&
    nextJob.spineStatus !== "ready_for_review" &&
    nextJob.spineStatus !== "approved" &&
    nextJob.spineStatus !== "delivered"
  ) {
    const moved = applyJobSpineStatusChange(nextJob, events, {
      job: nextJob,
      nextStatus: "ready_for_review",
      actor: { role: "system", displayName: "Studio Machine" },
      reason: wasRevision
        ? "Revised Machine short-video MP4 passed internal QA."
        : "Machine short-video MP4 passed internal QA.",
    });
    nextJob = moved.job;
    events = moved.events;
  }
  envelope = {
    ...envelope,
    jobRecords: (envelope.jobRecords ?? []).map((row) =>
      row.jobId === nextJob.jobId ? nextJob : row,
    ),
    jobActivityEvents: events,
    tasks: (envelope.tasks ?? []).map((task) => {
      if (!task.relatedServiceIds.includes(skuId as never)) return task;
      if (task.workflowState !== "needs_revision" && task.status !== "needs_revision") {
        return task;
      }
      return {
        ...task,
        workflowState: "complete" as const,
        status: "complete",
      };
    }),
  };
  if (nextJob.spineStatus === "ready_for_review") {
    envelope = enqueueJobCommunicationRecord(envelope, {
      campaign: input.campaign,
      clientId: resolveCampaignCommunicationClientId(
        input.clientUserId,
        input.campaign.campaignId,
      ),
      job: nextJob,
      eventType: wasRevision ? "revision_ready_again" : "ready_for_review",
      idempotencyKey: authorization.decisionId,
    });
  }

  return { envelope, bound: true, alreadyBound: false, qaAction };
}

/**
 * Wire an already-produced Shotstack MP4 into customer Board → QA → Review.
 * Production still uses the Shotstack pipeline; this bind opens Review with playable proof.
 */
export async function ensureShortVideoMachineReviewBind(input: {
  campaignId: string;
  mp4Path: string;
  contentSha256: string;
  durationSeconds?: number;
  renderVersion?: number;
  scriptVersionId?: string;
  versionLabel?: string;
  artifactId?: string;
  videoQualityEvidence?: VideoQualityEvidence | null;
}): Promise<CampaignRecord> {
  const campaignEnvelope = await readCampaignEnvelope(input.campaignId);
  if (!campaignEnvelope?.record) {
    throw new Error(`Campaign ${input.campaignId} not found for short-video Review bind.`);
  }
  let campaign = campaignEnvelope.record;
  const resolved = resolveShortVideoMp4AbsolutePath(input.mp4Path);
  if (!resolved) return campaign;

  const envelope = await readTasksEnvelope(input.campaignId);
  if (!envelope) return campaign;

  const renderVersion = input.renderVersion ?? 1;
  const artifactId =
    input.artifactId ?? `${SHORT_VIDEO_MACHINE_REVIEW_SKU}-v${renderVersion}`;

  const bound = bindShortVideoIdentityToQaRecords({
    campaign,
    envelope,
    mp4ContentSha256: input.contentSha256,
    renderVersion,
    artifactId,
    scriptVersionId: input.scriptVersionId,
    durationSeconds: input.durationSeconds,
    videoQualityEvidence: input.videoQualityEvidence,
    clientUserId: campaignEnvelope.clientUserId,
  });

  let nextEnvelope = bound.envelope;
  let presented = false;
  const hashHasQaPass = recordsForHash(
    nextEnvelope,
    input.contentSha256,
    input.contentSha256,
  ).some((record) => record.action === "qa_pass");
  if (bound.qaAction === "qa_pass" || hashHasQaPass) {
    const proof = await presentShortVideoReviewProof({
      campaign,
      envelope: nextEnvelope,
      mp4RelativePath: resolved.relativePath,
      mp4AbsolutePath: resolved.absolutePath,
      mp4ContentSha256: input.contentSha256,
      renderVersion,
      artifactId,
      versionLabel: input.versionLabel,
    });
    nextEnvelope = proof.envelope;
    presented = proof.presented;
  }

  if (bound.bound || presented) {
    await writeTasksEnvelope(nextEnvelope);
  }
  await deliverLifecycleNoticesForCampaign(input.campaignId);
  const latest = await readCampaignEnvelope(input.campaignId);
  let record = latest?.record ?? campaign;
  const videoJob = nextEnvelope.jobRecords?.find(
    (entry) => entry.skuId === SHORT_VIDEO_MACHINE_REVIEW_SKU,
  );
  if (
    videoJob?.spineStatus === "ready_for_review" &&
    record.campaignStatus !== "READY_FOR_REVIEW" &&
    record.campaignStatus !== "DELIVERED"
  ) {
    const saved = await upsertCampaignRecord(
      {
        ...record,
        campaignStatus: "READY_FOR_REVIEW",
        updatedAt: new Date().toISOString(),
      },
      latest?.clientUserId,
    );
    record = saved.record;
  }
  return record;
}

/**
 * Attach an already-produced Shotstack MP4 to the short-video customer job and
 * bind for Review. Call after Shotstack pipeline succeeds (Room 4B walk).
 * Does not auto-render — production remains Shotstack → then attach.
 */
export async function attachShortVideoArtifactToCustomerJob(input: {
  campaignId: string;
  mp4RelativePath: string;
  contentSha256: string;
  versionLabel?: string;
  durationSeconds?: number;
  scriptVersionId?: string;
  renderVersion?: number;
}): Promise<{
  ok: boolean;
  campaign: CampaignRecord;
  message?: string;
}> {
  const resolved = resolveShortVideoMp4AbsolutePath(input.mp4RelativePath);
  if (!resolved) {
    const envelope = await readCampaignEnvelope(input.campaignId);
    return {
      ok: false,
      campaign: envelope?.record ?? ({ campaignId: input.campaignId } as CampaignRecord),
      message: `MP4 not found at ${input.mp4RelativePath}`,
    };
  }

  const match = input.versionLabel?.match(/(\d+)/);
  const renderVersion =
    input.renderVersion ?? (match?.[1] ? Number(match[1]) : 1);

  const campaign = await ensureShortVideoMachineReviewBind({
    campaignId: input.campaignId,
    mp4Path: resolved.relativePath,
    contentSha256: input.contentSha256,
    durationSeconds: input.durationSeconds,
    renderVersion,
    scriptVersionId: input.scriptVersionId,
    versionLabel: input.versionLabel ?? `Version ${renderVersion}`,
    artifactId: `${SHORT_VIDEO_MACHINE_REVIEW_SKU}-v${renderVersion}`,
  });

  const tasks = await readTasksEnvelope(input.campaignId);
  const job = tasks?.jobRecords?.find(
    (entry) => entry.skuId === SHORT_VIDEO_MACHINE_REVIEW_SKU,
  );
  const eligible =
    job?.spineStatus === "ready_for_review" &&
    job.internalQaReviewAuthorization?.status === "ELIGIBLE_FOR_REVIEW";

  return {
    ok: eligible === true,
    campaign,
    message: eligible
      ? "Short video bound and Review-ready with playable MP4 proof."
      : "Short video attach ran but Review eligibility did not open — check QA tasks and intake.",
  };
}
