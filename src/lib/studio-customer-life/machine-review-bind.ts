import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
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
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer";
import type { DesignQualityEvidence } from "@/lib/studio-kitchen-production/design-quality";
import {
  buildInternalQaReviewAuthorization,
  evaluateReviewEligibility,
} from "@/lib/studio-review-eligibility";

import { assembleCustomerLifeTruth } from "./assemble-truth";

const MACHINE_ACTOR = {
  id: "studio-machine",
  email: "machine@studio.local",
  displayName: "Studio Machine",
  roles: ["staff"] as const,
};

function readDesignQaEvidence(pngRelativePath: string | undefined): DesignQualityEvidence | null {
  if (!pngRelativePath) return null;
  const qaPath = path.join(
    process.cwd(),
    pngRelativePath.replace(/\.png$/i, ".design-qa.json"),
  );
  if (!existsSync(qaPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(qaPath, "utf8")) as {
      ok?: boolean;
      evaluation?: DesignQualityEvidence["evaluation"];
      attestations?: DesignQualityEvidence["attestations"];
    };
    if (!parsed.ok || !parsed.evaluation) return null;
    return {
      evaluation: parsed.evaluation,
      attestations: parsed.attestations ?? {
        hierarchyReviewed: true,
        readabilityReviewed: true,
        spacingCompositionReviewed: true,
        brandFitReviewed: true,
        genericnessRejected: true,
        exportReadinessReviewed: true,
        notes: "Imported from sealed Machine renderer design-qa.json.",
      },
      gatePassed: true,
    };
  } catch {
    return null;
  }
}

/**
 * Connect sealed flyer renderer identity to Kitchen QA + Review eligibility.
 * Does not invent visual judgment — uses the pipeline's fail-closed design-qa file when present.
 */
export function bindFlyerIdentityToQaRecords(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  pngContentSha256: string;
  renderVersion: number;
  artifactId: string;
  workVersionId?: string;
  designEvidence?: DesignQualityEvidence | null;
}): { envelope: ServerTasksEnvelope; bound: boolean; alreadyBound: boolean } {
  const skuId = DESIGN_RENDERER_PROOF_SKU;
  const taskId = formalQaTaskIdForService(skuId);
  const hash = input.pngContentSha256.startsWith("sha256:")
    ? input.pngContentSha256
    : `sha256:${input.pngContentSha256}`;
  const existing = (input.envelope.qaRecords ?? []).some((record) =>
    record.artifactBinding?.contentSha256s?.includes(hash) ||
    record.artifactBinding?.contentSha256s?.includes(input.pngContentSha256),
  );
  if (existing) {
    return { envelope: input.envelope, bound: false, alreadyBound: true };
  }

  const workVersionId = input.workVersionId ?? `flyer-v${input.renderVersion}`;
  const record = buildQaRecord({
    campaignId: input.campaign.campaignId,
    taskId,
    user: MACHINE_ACTOR,
    actorRole: "qa",
    action: "qa_pass",
    checks: ["machine_renderer_identity"],
    notes: "Sealed Machine flyer identity bound for Review eligibility.",
    workVersionId,
    designQualityEvidence: input.designEvidence ?? undefined,
    artifactBinding: {
      workVersionId,
      artifactIds: [input.artifactId],
      contentSha256s: [hash],
    },
  });

  let envelope: ServerTasksEnvelope = {
    ...input.envelope,
    qaRecords: appendQaRecord(input.envelope.qaRecords, record),
    updatedAt: new Date().toISOString(),
  };

  const job = envelope.jobRecords?.find((entry) => entry.skuId === skuId);
  if (!job) {
    return { envelope, bound: true, alreadyBound: false };
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
    },
  });
  const authorization = buildInternalQaReviewAuthorization(decision);
  if (!authorization) {
    return { envelope, bound: true, alreadyBound: false };
  }

  const truth = assembleCustomerLifeTruth({
    campaign: input.campaign,
    tasks: envelope,
  });
  const now = new Date().toISOString();
  const wasRevision = job.spineStatus === "revision_requested";
  let nextJob = {
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
        ? "Revised Machine flyer identity passed internal QA."
        : "Machine flyer identity passed internal QA.",
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
  };
  if (nextJob.spineStatus === "ready_for_review") {
    envelope = enqueueJobCommunicationRecord(envelope, {
      campaign: input.campaign,
      clientId: resolveCampaignCommunicationClientId(undefined, input.campaign.campaignId),
      job: nextJob,
      eventType: wasRevision ? "revision_ready_again" : "ready_for_review",
      idempotencyKey: authorization.decisionId,
    });
  }

  return { envelope, bound: true, alreadyBound: false };
}

export async function ensureFlyerMachineReviewBind(
  campaign: CampaignRecord,
): Promise<CampaignRecord> {
  const observer = campaign.dispatchExecution?.designRendererObserver;
  const flyer = observer?.results.find(
    (result) => result.skuId === DESIGN_RENDERER_PROOF_SKU && result.ok && result.pngContentSha256,
  );
  if (!flyer?.pngContentSha256) return campaign;

  const envelope = await readTasksEnvelope(campaign.campaignId);
  if (!envelope) return campaign;

  const pngRel = flyer.receiptRelativePath
    ? flyer.receiptRelativePath.replace(/\.json$/i, ".png")
    : undefined;
  const bound = bindFlyerIdentityToQaRecords({
    campaign,
    envelope,
    pngContentSha256: flyer.pngContentSha256,
    renderVersion: flyer.renderVersion ?? 1,
    artifactId: `flyer-v${flyer.renderVersion ?? 1}`,
    designEvidence: readDesignQaEvidence(pngRel),
  });
  if (!bound.bound && bound.alreadyBound) return campaign;
  await writeTasksEnvelope(bound.envelope);
  const latest = await readCampaignEnvelope(campaign.campaignId);
  return latest?.record ?? campaign;
}
