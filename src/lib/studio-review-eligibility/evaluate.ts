import { studioReviewEligibilityV1 } from "@/config/studio-review-eligibility-v1";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import type {
  CampaignTaskItem,
  QaRecord,
} from "@/lib/campaign-tasks/types";
import {
  requiresAudioQualityGate,
  requiresCopyQualityGate,
  requiresDesignQualityGate,
  requiresVideoQualityGate,
} from "@/lib/studio-kitchen-production/quality-gates";

import { evaluateCategoryEvidenceGaps } from "./sku-evidence";
import type {
  InternalQaReviewAuthorization,
  ReviewCandidateRef,
  ReviewEligibilityBlockCode,
  ReviewEligibilityDecision,
  ReviewEligibilityQaKind,
} from "./types";

function newDecisionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `re-${crypto.randomUUID()}`;
  }
  return `re-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function tasksForSku(
  tasks: readonly CampaignTaskItem[],
  skuId: string,
): CampaignTaskItem[] {
  return tasks.filter((task) => task.relatedServiceIds.includes(skuId as never));
}

function recordsForTask(
  qaRecords: readonly QaRecord[],
  taskId: string,
): QaRecord[] {
  return qaRecords
    .filter((record) => record.taskId === taskId)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function latestRecord(
  qaRecords: readonly QaRecord[],
  taskId: string,
): QaRecord | null {
  const list = recordsForTask(qaRecords, taskId);
  return list.length ? list[list.length - 1]! : null;
}

export function resolveRequiredQaKinds(
  tasks: readonly CampaignTaskItem[],
): ReviewEligibilityQaKind[] {
  const kinds = new Set<ReviewEligibilityQaKind>();
  for (const task of tasks) {
    if (requiresVideoQualityGate(task)) kinds.add("video");
    if (requiresAudioQualityGate(task)) kinds.add("audio");
    if (requiresDesignQualityGate(task)) kinds.add("design");
    if (requiresCopyQualityGate(task)) kinds.add("copy");
  }
  // Every SKU with Kitchen tasks needs a formal QA-phase pass (or gated pass on that task).
  if (tasks.some((task) => task.phase === "qa")) {
    kinds.add("task_qa_pass");
  } else if (kinds.size === 0 && tasks.length > 0) {
    kinds.add("task_qa_pass");
  }
  return [...kinds];
}

function pickQaAuthorityTask(
  tasks: readonly CampaignTaskItem[],
  kind: ReviewEligibilityQaKind,
): CampaignTaskItem | null {
  const qaPhase = tasks.filter((task) => task.phase === "qa");
  const pool = qaPhase.length > 0 ? qaPhase : [...tasks];

  if (kind === "video") {
    return pool.find((task) => requiresVideoQualityGate(task)) ?? null;
  }
  if (kind === "audio") {
    return pool.find((task) => requiresAudioQualityGate(task)) ?? null;
  }
  if (kind === "design") {
    return (
      pool.find((task) => requiresDesignQualityGate(task)) ??
      tasks.find((task) => requiresDesignQualityGate(task)) ??
      null
    );
  }
  if (kind === "copy") {
    return (
      pool.find((task) => requiresCopyQualityGate(task)) ??
      tasks.find((task) => requiresCopyQualityGate(task)) ??
      null
    );
  }
  return pool.find((task) => task.phase === "qa") ?? null;
}

function familyGatePassed(record: QaRecord, kind: ReviewEligibilityQaKind): boolean {
  if (kind === "copy") {
    return record.copyQualityEvidence?.gatePassed === true;
  }
  if (kind === "design") {
    return record.designQualityEvidence?.gatePassed === true;
  }
  if (kind === "audio") {
    return record.audioQualityEvidence?.gatePassed === true;
  }
  if (kind === "video") {
    return record.videoQualityEvidence?.gatePassed === true;
  }
  return record.action === "qa_pass";
}

function extractBinding(record: QaRecord): {
  workVersionId: string | null;
  contentSha256s: string[];
  artifactIds: string[];
  scriptVersionId: string | null;
} {
  const binding = record.artifactBinding;
  return {
    workVersionId: record.workVersionId ?? binding?.workVersionId ?? null,
    contentSha256s: [...(binding?.contentSha256s ?? [])].filter(Boolean),
    artifactIds: [...(binding?.artifactIds ?? [])].filter(Boolean),
    scriptVersionId: binding?.scriptVersionId ?? null,
  };
}

function isSupersededByNewerVersion(
  record: QaRecord,
  taskId: string,
  production: ServerProductionEnvelope | null | undefined,
): boolean {
  if (!production || !record.workVersionId) return false;
  const pinned = production.versions.find((version) => version.id === record.workVersionId);
  if (!pinned) return true;
  return production.versions.some(
    (version) =>
      version.taskId === taskId &&
      version.createdAt > pinned.createdAt &&
      version.id !== pinned.id,
  );
}

/**
 * Authoritative review-eligibility evaluation.
 * Voice / UI communicate only — this decides.
 */
export function evaluateReviewEligibility(input: {
  jobId: string;
  campaignId: string;
  skuId: string;
  tasks: readonly CampaignTaskItem[];
  qaRecords: readonly QaRecord[];
  production?: ServerProductionEnvelope | null;
  reviewCandidate?: ReviewCandidateRef | null;
}): ReviewEligibilityDecision {
  const copy = studioReviewEligibilityV1.staffCopy;
  const skuTasks = tasksForSku(input.tasks, input.skuId);
  const blockCodes: ReviewEligibilityBlockCode[] = [];
  const reasons: string[] = [];
  const requiredQaKinds = resolveRequiredQaKinds(skuTasks);
  const qaRecordIds: string[] = [];
  const contentSha256s: string[] = [];
  const artifactIds: string[] = [];
  let workVersionId: string | null = null;

  if (skuTasks.length === 0) {
    blockCodes.push("missing_tasks");
    reasons.push(copy.missingTasks);
  }

  for (const kind of requiredQaKinds) {
    const task = pickQaAuthorityTask(skuTasks, kind);
    if (!task) {
      blockCodes.push("missing_qa");
      reasons.push(copy.missingQa);
      continue;
    }

    const latest = latestRecord(input.qaRecords, task.id);
    if (!latest) {
      blockCodes.push("missing_qa");
      reasons.push(copy.missingQa);
      continue;
    }

    if (latest.action === "qa_fail") {
      blockCodes.push("qa_failed");
      reasons.push(copy.qaFailed);
      continue;
    }

    if (latest.action !== "qa_pass") {
      blockCodes.push("missing_qa");
      reasons.push(copy.missingQa);
      continue;
    }

    if (kind !== "task_qa_pass" && !familyGatePassed(latest, kind)) {
      if (kind === "video") {
        blockCodes.push("video_render_without_qa");
        reasons.push(copy.videoRenderOnly);
      } else {
        blockCodes.push("family_gate_missing");
        reasons.push(copy.missingQa);
      }
      continue;
    }

    if (isSupersededByNewerVersion(latest, task.id, input.production)) {
      blockCodes.push("superseded");
      reasons.push(copy.superseded);
      continue;
    }

    const binding = extractBinding(latest);
    const candidate = input.reviewCandidate;

    if (
      candidate?.workVersionId &&
      binding.workVersionId &&
      candidate.workVersionId !== binding.workVersionId
    ) {
      blockCodes.push("wrong_version");
      reasons.push(copy.wrongVersion);
      continue;
    }

    if (
      candidate?.artifactId &&
      binding.artifactIds.length > 0 &&
      !binding.artifactIds.includes(candidate.artifactId)
    ) {
      blockCodes.push("wrong_artifact");
      reasons.push(copy.wrongArtifact);
      continue;
    }

    if (
      candidate?.contentSha256 &&
      binding.contentSha256s.length > 0 &&
      !binding.contentSha256s.includes(candidate.contentSha256)
    ) {
      blockCodes.push("wrong_hash");
      reasons.push(copy.wrongHash);
      continue;
    }

    if (
      candidate?.contentSha256 &&
      binding.contentSha256s.length === 0 &&
      (kind === "design" || kind === "audio" || kind === "video")
    ) {
      // Hash available on candidate but QA record has no bound hash → cannot prove same bytes.
      blockCodes.push("wrong_hash");
      reasons.push(copy.wrongHash);
      continue;
    }

    if (
      candidate?.scriptVersionId &&
      binding.scriptVersionId &&
      candidate.scriptVersionId !== binding.scriptVersionId
    ) {
      blockCodes.push("wrong_version");
      reasons.push(copy.wrongVersion);
      continue;
    }

    qaRecordIds.push(latest.id);
    if (binding.workVersionId) workVersionId = binding.workVersionId;
    contentSha256s.push(...binding.contentSha256s);
    artifactIds.push(...binding.artifactIds);
  }

  const categoryGaps = evaluateCategoryEvidenceGaps({
    skuId: input.skuId,
    tasks: skuTasks,
    qaRecords: input.qaRecords,
    production: input.production,
  });
  blockCodes.push(...categoryGaps.blockCodes);
  reasons.push(...categoryGaps.reasons);

  const uniqueCodes = [...new Set(blockCodes)];
  const uniqueReasons = [...new Set(reasons)];
  const eligible = uniqueCodes.length === 0 && requiredQaKinds.length > 0;

  return {
    decisionId: newDecisionId(),
    schemaVersion: studioReviewEligibilityV1.decisionSchemaVersion,
    packageId: studioReviewEligibilityV1.packageId,
    outcome: eligible
      ? studioReviewEligibilityV1.outcomes.eligibleForReview
      : studioReviewEligibilityV1.outcomes.blockedForInternalQa,
    jobId: input.jobId,
    campaignId: input.campaignId,
    skuId: input.skuId,
    requiredQaKinds,
    qaRecordIds: [...new Set(qaRecordIds)],
    workVersionId,
    contentSha256s: [...new Set(contentSha256s)],
    artifactIds: [...new Set(artifactIds)],
    blockCodes: uniqueCodes,
    reasons: uniqueReasons,
    escalationTarget: "none",
    customerMessage: eligible
      ? null
      : studioReviewEligibilityV1.customerCopy.stillPreparing,
    evaluatedAt: new Date().toISOString(),
  };
}

export function buildInternalQaReviewAuthorization(
  decision: ReviewEligibilityDecision,
  authorizedAt: string = new Date().toISOString(),
): InternalQaReviewAuthorization | null {
  if (
    decision.outcome !== studioReviewEligibilityV1.outcomes.eligibleForReview
  ) {
    return null;
  }
  return {
    status: "ELIGIBLE_FOR_REVIEW",
    decisionId: decision.decisionId,
    packageId: decision.packageId,
    skuId: decision.skuId,
    qaRecordIds: [...decision.qaRecordIds],
    workVersionId: decision.workVersionId,
    contentSha256s: [...decision.contentSha256s],
    artifactIds: [...decision.artifactIds],
    authorizedAt,
  };
}

export function isEligibleForReview(decision: ReviewEligibilityDecision): boolean {
  return (
    decision.outcome === studioReviewEligibilityV1.outcomes.eligibleForReview
  );
}
