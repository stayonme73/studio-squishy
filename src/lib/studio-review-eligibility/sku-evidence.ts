/**
 * Authoritative evidence expectations for Review eligibility.
 * Method-covered / kit / landing paths must not earn Review on empty checklists.
 */

import { studioReviewEligibilityV1 } from "@/config/studio-review-eligibility-v1";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import type { CampaignTaskItem, QaRecord } from "@/lib/campaign-tasks/types";
import { LANDING_PAGE_SKU } from "@/lib/studio-kitchen-production/landing-page";

import type { ReviewEligibilityBlockCode } from "./types";

/** Closeout METHOD COVERED SKUs that inherit certified Canva/design method. */
export const METHOD_COVERED_DESIGN_SKUS = [
  "bf-001",
  "sm-001",
  "sm-001-monthly",
  "rm-j007",
] as const;

/** Closeout METHOD COVERED SKUs that inherit certified copy_channels method. */
export const METHOD_COVERED_COPY_SKUS = ["em-001-monthly"] as const;

export function isProfileKitSku(skuId: string): boolean {
  return (studioReviewEligibilityV1.profileKitSkuIds as readonly string[]).includes(
    skuId,
  );
}

export function isLandingPageSku(skuId: string): boolean {
  return skuId === LANDING_PAGE_SKU;
}

export function isMethodCoveredDesignSku(skuId: string): boolean {
  return (METHOD_COVERED_DESIGN_SKUS as readonly string[]).includes(skuId);
}

export function isMethodCoveredCopySku(skuId: string): boolean {
  return (METHOD_COVERED_COPY_SKUS as readonly string[]).includes(skuId);
}

function recordsForSku(
  tasks: readonly CampaignTaskItem[],
  qaRecords: readonly QaRecord[],
  skuId: string,
): QaRecord[] {
  const taskIds = new Set(
    tasks
      .filter((task) => task.relatedServiceIds.includes(skuId as never))
      .map((task) => task.id),
  );
  return qaRecords.filter(
    (record) => taskIds.has(record.taskId) && record.action === "qa_pass",
  );
}

export function hasDesignGatePassForSku(
  tasks: readonly CampaignTaskItem[],
  qaRecords: readonly QaRecord[],
  skuId: string,
): boolean {
  return recordsForSku(tasks, qaRecords, skuId).some(
    (record) => record.designQualityEvidence?.gatePassed === true,
  );
}

export function hasCopyGatePassForSku(
  tasks: readonly CampaignTaskItem[],
  qaRecords: readonly QaRecord[],
  skuId: string,
): boolean {
  return recordsForSku(tasks, qaRecords, skuId).some(
    (record) => record.copyQualityEvidence?.gatePassed === true,
  );
}

export function hasLandingPageQaEvidenceForSku(
  tasks: readonly CampaignTaskItem[],
  qaRecords: readonly QaRecord[],
  skuId: string,
): boolean {
  return recordsForSku(tasks, qaRecords, skuId).some(
    (record) =>
      record.landingPageQaEvidence?.machineChecksOk === true &&
      Boolean(record.landingPageQaEvidence.contentSha256) &&
      Boolean(record.landingPageQaEvidence.artifactId),
  );
}

/** Kitchen V1 sm-001 path: qa_pass pinned to an exact production work version. */
export function hasKitchenPinnedWorkVersionPass(
  tasks: readonly CampaignTaskItem[],
  qaRecords: readonly QaRecord[],
  production: ServerProductionEnvelope | null | undefined,
  skuId: string,
): boolean {
  if (skuId !== "sm-001" && skuId !== "sm-001-monthly") return false;
  if (!production) return false;
  const passes = recordsForSku(tasks, qaRecords, skuId).filter(
    (record) => Boolean(record.workVersionId),
  );
  return passes.some((record) => {
    const version = production.versions.find((entry) => entry.id === record.workVersionId);
    return (
      version?.qaPin?.action === "qa_pass" &&
      version.qaPin.qaRecordId === record.id
    );
  });
}

export function hasBoundArtifactHashesForSku(
  tasks: readonly CampaignTaskItem[],
  qaRecords: readonly QaRecord[],
  skuId: string,
): boolean {
  return recordsForSku(tasks, qaRecords, skuId).some(
    (record) => (record.artifactBinding?.contentSha256s?.length ?? 0) > 0,
  );
}

/**
 * Extra evidence beyond generic task_qa_pass checklists.
 * Returns block codes when the category's authoritative evidence is missing.
 */
export function evaluateCategoryEvidenceGaps(input: {
  skuId: string;
  tasks: readonly CampaignTaskItem[];
  qaRecords: readonly QaRecord[];
  production?: ServerProductionEnvelope | null;
}): { blockCodes: ReviewEligibilityBlockCode[]; reasons: string[] } {
  const blockCodes: ReviewEligibilityBlockCode[] = [];
  const reasons: string[] = [];
  const { skuId, tasks, qaRecords, production } = input;
  const staff = studioReviewEligibilityV1.staffCopy;

  if (isLandingPageSku(skuId)) {
    if (!hasLandingPageQaEvidenceForSku(tasks, qaRecords, skuId)) {
      blockCodes.push("family_gate_missing");
      reasons.push(
        "Landing Page Review requires machine QA ok bound to the exact HTML artifact (contentSha256) — checklist alone is not enough.",
      );
    }
  }

  if (isProfileKitSku(skuId)) {
    if (!hasCopyGatePassForSku(tasks, qaRecords, skuId)) {
      blockCodes.push("family_gate_missing");
      reasons.push(
        "Profile kit Review requires certified copy-method QA evidence (bio/about copy), not checklist alone.",
      );
    }
    if (!hasDesignGatePassForSku(tasks, qaRecords, skuId)) {
      blockCodes.push("family_gate_missing");
      reasons.push(
        "Profile kit Review requires certified design-method QA evidence (profile/cover assets), not checklist alone.",
      );
    }
    if (!hasBoundArtifactHashesForSku(tasks, qaRecords, skuId)) {
      blockCodes.push("wrong_hash");
      reasons.push(staff.wrongHash);
    }
  }

  if (isMethodCoveredDesignSku(skuId)) {
    const designOk = hasDesignGatePassForSku(tasks, qaRecords, skuId);
    const kitchenOk = hasKitchenPinnedWorkVersionPass(
      tasks,
      qaRecords,
      production,
      skuId,
    );
    if (!designOk && !kitchenOk) {
      blockCodes.push("family_gate_missing");
      reasons.push(
        "Method-covered SKU Review requires the underlying certified design-method QA (or Kitchen V1 work-version pin for sm-001), not checklist alone.",
      );
    }
  }

  if (isMethodCoveredCopySku(skuId)) {
    if (!hasCopyGatePassForSku(tasks, qaRecords, skuId)) {
      blockCodes.push("family_gate_missing");
      reasons.push(
        "Method-covered copy SKU Review requires certified copy_channels QA evidence, not checklist alone.",
      );
    }
  }

  return { blockCodes, reasons };
}
