import type { CampaignRecord } from "@/config/studio-board";

/**
 * Customer PATCH is default-deny: start from the server record and copy only
 * customer-owned fields from the incoming payload. Studio-owned fields are never
 * taken from the client.
 */
const CUSTOMER_OWNED_SYNC_FIELDS = [
  "campaignName",
  "campaignDescription",
  "estimatedCompletion",
  "campaignStatus",
  "packageId",
  "packageLabel",
  "intake",
  "visionData",
  "visionSubmittedAt",
  "discoveryAnswers",
  "discoverySubmittedAt",
  "routeMapContext",
  "routeMapIntake",
  "routeMapIntakeDraft",
  "routeMapIntakeSubmittedAt",
  "selectedCampaignOption",
  "concepts",
  "conceptsGeneratedAt",
  "targetCompletionDate",
] as const satisfies readonly (keyof CampaignRecord)[];

type CustomerOwnedField = (typeof CUSTOMER_OWNED_SYNC_FIELDS)[number];

function copyCustomerOwnedFields(
  base: CampaignRecord,
  incoming: CampaignRecord,
): CampaignRecord {
  const merged = { ...base };
  for (const key of CUSTOMER_OWNED_SYNC_FIELDS) {
    if (incoming[key] !== undefined) {
      (merged as Record<CustomerOwnedField, CampaignRecord[CustomerOwnedField]>)[key] =
        incoming[key] as CampaignRecord[CustomerOwnedField];
    }
  }
  return merged;
}

/**
 * Merge a client sync payload onto the authoritative server record.
 * When no server record exists yet, bootstrap a new campaign from allowlisted fields only.
 */
export function mergeCustomerOwnedCampaignSync(
  existing: CampaignRecord | null,
  incoming: CampaignRecord,
): CampaignRecord {
  if (!existing) {
    let bootstrapped = copyCustomerOwnedFields(
      {
        campaignId: incoming.campaignId,
        campaignName: incoming.campaignName,
        campaignStatus: incoming.campaignStatus,
        campaignDescription: incoming.campaignDescription,
        estimatedCompletion: incoming.estimatedCompletion,
        packageId: incoming.packageId,
        packageLabel: incoming.packageLabel,
        revisionRoundsUsed: 0,
        deliverablesDelivered: {},
        createdAt: incoming.createdAt,
        updatedAt: incoming.updatedAt,
      },
      incoming,
    );

    if (incoming.approvedStudioPlan) bootstrapped.approvedStudioPlan = incoming.approvedStudioPlan;
    // paymentReceivedAt / paymentTruth / preAcceptancePaymentAuthorization are
    // server-owned — never bootstrap from untrusted client sync.
    if (incoming.revisionRoundsIncluded != null) {
      bootstrapped.revisionRoundsIncluded = incoming.revisionRoundsIncluded;
    }
    if (incoming.projectDetails) bootstrapped.projectDetails = incoming.projectDetails;
    if (incoming.projectDetailsSubmittedAt) {
      bootstrapped.projectDetailsSubmittedAt = incoming.projectDetailsSubmittedAt;
    }

    return bootstrapped;
  }

  let merged = copyCustomerOwnedFields(existing, incoming);

  if (!existing.approvedStudioPlan && incoming.approvedStudioPlan) {
    merged.approvedStudioPlan = incoming.approvedStudioPlan;
  }
  // Reject client attempts to invent or upgrade payment truth.
  if (existing.paymentReceivedAt) {
    merged.paymentReceivedAt = existing.paymentReceivedAt;
  } else {
    delete merged.paymentReceivedAt;
  }
  if (existing.paymentTruth) {
    merged.paymentTruth = existing.paymentTruth;
  } else {
    delete merged.paymentTruth;
  }
  if (existing.preAcceptancePaymentAuthorization) {
    merged.preAcceptancePaymentAuthorization =
      existing.preAcceptancePaymentAuthorization;
  } else {
    delete merged.preAcceptancePaymentAuthorization;
  }
  if (existing.revisionRoundsIncluded == null && incoming.revisionRoundsIncluded != null) {
    merged.revisionRoundsIncluded = incoming.revisionRoundsIncluded;
  }
  if (!existing.projectDetailsSubmittedAt) {
    if (incoming.projectDetails) merged.projectDetails = incoming.projectDetails;
    if (incoming.projectDetailsSubmittedAt) {
      merged.projectDetailsSubmittedAt = incoming.projectDetailsSubmittedAt;
    }
  }

  return merged;
}
