import type { CampaignRecord } from "@/config/studio-board";
import { isBlockingMaterialItem } from "@/lib/materials/materials-view";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import type {
  JobAcceptanceReview,
  JobActivityActor,
  PurchasedJobRecord,
} from "./types";

export const ACCEPTANCE_REVIEW_PURPOSE =
  "Before production begins, confirm that both the client and The Studio understand the service, scope, timeline, responsibilities, risks, and required materials.";

export const ACCEPTANCE_REVIEW_CLIENT_CONFIRMATIONS = [
  "I have reviewed the selected service and confirm it matches the outcome I want.",
  "I understand what is included.",
  "I understand what is not included.",
  "I understand the revision policy.",
  "I understand the estimated production timeline and the factors that may affect delivery.",
  "I understand which required materials have and have not been provided.",
  "I understand that The Studio may begin work with the materials currently provided.",
  "I understand that any work requiring missing materials cannot begin until those materials are received.",
  "I confirm I own or have permission to use all uploaded files and materials.",
  "I confirm any factual claims, testimonials, statistics, health claims, or other statements I provide are accurate and can be substantiated if requested.",
  "My contact information is correct.",
  "I have provided any important deadlines, event dates, or launch dates that may affect production.",
  "I understand delays caused by missing materials, delayed feedback, or delayed approvals may affect delivery.",
] as const;

export const ACCEPTANCE_REVIEW_STUDIO_CONFIRMATIONS = [
  "We understand the requested outcome.",
  "The scope is clear.",
  "Capacity is available.",
  "We can confidently deliver within the agreed production window.",
  "We have identified any missing materials and communicated how they affect production.",
  "Compliance concerns have been addressed or routed before production begins.",
  "Pricing is correct.",
  "The project fits Studio policy.",
  "We have informed the client of any known risks that could affect delivery.",
  "We have clearly communicated any assumptions that require client confirmation.",
] as const;

export const ACCEPTANCE_REVIEW_MUTUAL_UNDERSTANDING =
  "By proceeding, both the client and The Studio acknowledge that this project begins with a shared understanding of the requested work, scope, timeline, responsibilities, required materials, and applicable Studio policies. Any changes requested after acceptance may affect pricing, production scheduling, or delivery timelines according to Studio policy.";

export function missingBlockingMaterialsForJob(
  materials: readonly CampaignMaterialItem[],
  job: PurchasedJobRecord,
): CampaignMaterialItem[] {
  return materials.filter(
    (item) => isBlockingMaterialItem(item) && item.relatedServiceIds.includes(job.skuId),
  );
}

export function buildAcceptedAcceptanceReview(input: {
  campaign: CampaignRecord;
  job: PurchasedJobRecord;
  materials: readonly CampaignMaterialItem[];
  actor: JobActivityActor;
  occurredAt: string;
}): JobAcceptanceReview {
  const missingMaterials = missingBlockingMaterialsForJob(input.materials, input.job).map(
    (item) => item.label,
  );
  const assumptions = [
    `Service: ${input.job.serviceName}`,
    `Production window: ${input.campaign.estimatedCompletion ?? "standard Studio timing"}`,
  ];

  return {
    status: missingMaterials.length > 0 ? "blocked" : "accepted",
    reviewedAt: input.occurredAt,
    reviewedBy: input.actor,
    clientConfirmed: ACCEPTANCE_REVIEW_CLIENT_CONFIRMATIONS,
    studioConfirmed: ACCEPTANCE_REVIEW_STUDIO_CONFIRMATIONS,
    missingMaterials,
    risks: [],
    assumptions,
    routeTo: missingMaterials.length > 0 ? "squishy_decision_core" : "production",
    note:
      missingMaterials.length > 0
        ? "Required materials are missing. Squishy and Decision Core must route the client choice before production begins."
        : ACCEPTANCE_REVIEW_MUTUAL_UNDERSTANDING,
  };
}

export function hasAcceptedAcceptanceReview(job: PurchasedJobRecord): boolean {
  return job.acceptanceReview?.status === "accepted";
}
