import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
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
import { DESIGN_RENDERER_PROOF_SKU } from "@/lib/studio-design-renderer";
import type { DesignQualityEvidence } from "@/lib/studio-kitchen-production/design-quality";
import {
  buildInternalQaReviewAuthorization,
  evaluateReviewEligibility,
} from "@/lib/studio-review-eligibility";

import { presentFlyerReviewProof } from "@/lib/studio-review-revision/present-flyer-review";
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

/**
 * Resolve the sealed flyer PNG. Receipt JSON and flyer.png are siblings in name
 * only by coincidence — identity.pngRelativePath is the file QA and Review must use.
 */
export function resolveFlyerObserverPngRelativePath(flyer: {
  pngRelativePath?: string;
  receiptRelativePath?: string;
}): string | undefined {
  if (flyer.pngRelativePath?.trim()) {
    return normalizeRel(flyer.pngRelativePath);
  }
  const receiptRel = flyer.receiptRelativePath?.trim()
    ? normalizeRel(flyer.receiptRelativePath)
    : undefined;
  if (!receiptRel) return undefined;
  const receiptAbs = path.join(process.cwd(), receiptRel);
  if (existsSync(receiptAbs)) {
    try {
      const parsed = JSON.parse(readFileSync(receiptAbs, "utf8")) as {
        identity?: { pngRelativePath?: string };
      };
      if (parsed.identity?.pngRelativePath?.trim()) {
        return normalizeRel(parsed.identity.pngRelativePath);
      }
    } catch {
      /* fall through to sibling guess */
    }
  }
  const sibling = receiptRel.replace(/\.json$/i, ".png");
  return existsSync(path.join(process.cwd(), sibling)) ? sibling : undefined;
}

export function resolveFlyerObserverPdfRelativePath(flyer: {
  pdfRelativePath?: string;
  pngRelativePath?: string;
  receiptRelativePath?: string;
}): string | undefined {
  if (flyer.pdfRelativePath?.trim()) {
    return normalizeRel(flyer.pdfRelativePath);
  }
  const pngRel = resolveFlyerObserverPngRelativePath(flyer);
  if (!pngRel) return undefined;
  const sibling = pngRel.replace(/\.png$/i, ".pdf");
  return existsSync(path.join(process.cwd(), sibling)) ? sibling : undefined;
}

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

/**
 * Connect sealed flyer renderer identity to Kitchen QA + Review eligibility.
 * Renderer success alone is not customer-ready: missing or failing design-qa
 * records qa_fail and keeps Review closed.
 */
export function bindFlyerIdentityToQaRecords(input: {
  campaign: CampaignRecord;
  envelope: ServerTasksEnvelope;
  pngContentSha256: string;
  pdfContentSha256?: string;
  renderVersion: number;
  artifactId: string;
  workVersionId?: string;
  designEvidence?: DesignQualityEvidence | null;
  clientUserId?: string | null;
}): {
  envelope: ServerTasksEnvelope;
  bound: boolean;
  alreadyBound: boolean;
  qaAction: "qa_pass" | "qa_fail" | "none";
} {
  const skuId = DESIGN_RENDERER_PROOF_SKU;
  const taskId = formalQaTaskIdForService(skuId);
  const hash = normalizeContentSha256(input.pngContentSha256);
  const pdfHash = input.pdfContentSha256
    ? normalizeContentSha256(input.pdfContentSha256)
    : undefined;
  const boundHashes = [hash, pdfHash].filter((value): value is string => Boolean(value));
  const matching = recordsForHash(input.envelope, hash, input.pngContentSha256);
  if (matching.some((record) => record.action === "qa_pass")) {
    return {
      envelope: input.envelope,
      bound: false,
      alreadyBound: true,
      qaAction: "none",
    };
  }

  const evidencePassed = input.designEvidence?.gatePassed === true;
  if (!evidencePassed && matching.some((record) => record.action === "qa_fail")) {
    return {
      envelope: input.envelope,
      bound: false,
      alreadyBound: true,
      qaAction: "none",
    };
  }

  const workVersionId = input.workVersionId ?? `flyer-v${input.renderVersion}`;
  const qaAction = evidencePassed ? "qa_pass" : "qa_fail";
  const record = buildQaRecord({
    campaignId: input.campaign.campaignId,
    taskId,
    user: MACHINE_ACTOR,
    actorRole: "qa",
    action: qaAction,
    category: evidencePassed ? undefined : "production_correction",
    checks: ["machine_renderer_identity"],
    notes: evidencePassed
      ? "Sealed Machine flyer identity bound for Review eligibility."
      : "Renderer output is not customer-ready. Internal quality evidence did not pass.",
    workVersionId,
    designQualityEvidence: input.designEvidence ?? undefined,
    artifactBinding: {
      workVersionId,
      artifactIds: [input.artifactId],
      contentSha256s: boundHashes,
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
    return { envelope, bound: true, alreadyBound: false, qaAction };
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
    return { envelope, bound: true, alreadyBound: false, qaAction };
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
  const campaignEnvelope = await readCampaignEnvelope(campaign.campaignId);

  const pngRel = resolveFlyerObserverPngRelativePath(flyer);
  const pdfRel = resolveFlyerObserverPdfRelativePath(flyer);
  const bound = bindFlyerIdentityToQaRecords({
    campaign,
    envelope,
    pngContentSha256: flyer.pngContentSha256,
    pdfContentSha256: flyer.pdfContentSha256,
    renderVersion: flyer.renderVersion ?? 1,
    artifactId: `flyer-v${flyer.renderVersion ?? 1}`,
    designEvidence: readDesignQaEvidence(pngRel),
    clientUserId: campaignEnvelope?.clientUserId,
  });

  let nextEnvelope = bound.envelope;
  let presented = false;
  const hashHasQaPass = recordsForHash(
    nextEnvelope,
    flyer.pngContentSha256,
    flyer.pngContentSha256,
  ).some((record) => record.action === "qa_pass");
  if (bound.qaAction === "qa_pass" || hashHasQaPass) {
    const proof = await presentFlyerReviewProof({
      campaign,
      envelope: nextEnvelope,
      pngRelativePath: pngRel,
      pngContentSha256: flyer.pngContentSha256,
      pdfRelativePath: pdfRel,
      pdfContentSha256: flyer.pdfContentSha256,
      renderVersion: flyer.renderVersion ?? 1,
      artifactId: `flyer-v${flyer.renderVersion ?? 1}`,
    });
    nextEnvelope = proof.envelope;
    presented = proof.presented;
  }

  if (bound.bound || presented) {
    await writeTasksEnvelope(nextEnvelope);
  }
  await deliverLifecycleNoticesForCampaign(campaign.campaignId);
  const latest = await readCampaignEnvelope(campaign.campaignId);
  let record = latest?.record ?? campaign;
  const flyerJob = nextEnvelope.jobRecords?.find(
    (entry) => entry.skuId === DESIGN_RENDERER_PROOF_SKU,
  );
  if (
    flyerJob?.spineStatus === "ready_for_review" &&
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
