import { studioExternalCustomerContentIntakeAndRightsCertificationV1 } from "@/config/studio-external-customer-content-intake-and-rights-certification-v1";
import { categoryRequiresUseClearance } from "@/lib/studio-material-use";
import type { MaterialCategory } from "@/lib/materials/types";

import { newContentCertificationId } from "./certification-id";
import {
  rightsMissingCropAdaptPermission,
  rightsNeedFollowUp,
  technicalNeedsReview,
} from "./rights-record";
import type {
  ContentRoutingState,
  CustomerContentCertification,
  CustomerContentRightsRecord,
  CustomerContentRoutingHistoryEntry,
  CustomerContentTechnicalInspection,
} from "./types";

const PACKAGE_ID = studioExternalCustomerContentIntakeAndRightsCertificationV1.packageId;

export const CONTENT_ROUTING_LABELS: Record<ContentRoutingState, string> = {
  RECEIVED: "Received — review pending",
  RIGHTS_INFORMATION_REQUIRED: "Rights information required",
  TECHNICAL_REVIEW_REQUIRED: "Technical review required",
  CLEARED_FOR_PRODUCTION: "Cleared for production",
  CLEARED_WITH_LIMITS: "Cleared with limits",
  QUARANTINED: "Quarantined — Studio review required",
  REJECTED: "Rejected",
  SUPERSEDED: "Superseded by a newer file",
  WITHDRAWN_BY_CUSTOMER: "Withdrawn",
};

function historyEntry(
  from: ContentRoutingState | null,
  to: ContentRoutingState,
  reason: string,
  at: string,
): CustomerContentRoutingHistoryEntry {
  return { at, from, to, reason };
}

export function resolveContentRoutingState(input: {
  category: MaterialCategory;
  technical: CustomerContentTechnicalInspection;
  rights: CustomerContentRightsRecord;
  evaluatedAt?: string;
}): {
  routingState: ContentRoutingState;
  productionCleared: boolean;
  productionBlockReason: string | null;
  limits: readonly string[];
  reason: string;
} {
  const { technical, rights, category } = input;

  if (technical.corrupt || technical.passwordProtected) {
    return {
      routingState: "REJECTED",
      productionCleared: false,
      productionBlockReason: technical.issues[0] ?? "File rejected during technical inspection.",
      limits: [],
      reason: "Technical inspection rejected the file.",
    };
  }

  if (!technical.supported) {
    return {
      routingState: "QUARANTINED",
      productionCleared: false,
      productionBlockReason:
        technical.issues[0] ?? "File is quarantined until technical review completes.",
      limits: [],
      reason: "Unsupported or unverified file type.",
    };
  }

  if (technicalNeedsReview(technical)) {
    return {
      routingState: "TECHNICAL_REVIEW_REQUIRED",
      productionCleared: false,
      productionBlockReason:
        technical.issues[0] ?? "File needs technical review before production use.",
      limits: [],
      reason: "Technical review required.",
    };
  }

  if (rightsNeedFollowUp(rights, category)) {
    return {
      routingState: "RIGHTS_INFORMATION_REQUIRED",
      productionCleared: false,
      productionBlockReason: "The Studio needs file-specific rights information before production use.",
      limits: [],
      reason: "Rights information incomplete.",
    };
  }

  if (rights.rightsAnswersContradictFilenameHints) {
    return {
      routingState: "QUARANTINED",
      productionCleared: false,
      productionBlockReason:
        "Your answers do not match signals in this file name. The Studio will review this file before production use.",
      limits: [],
      reason: "Customer rights answers contradict filename hints.",
    };
  }

  if (rights.recognizablePeoplePresent === true && !rights.likenessConsentConfirmed) {
    return {
      routingState: "QUARANTINED",
      productionCleared: false,
      productionBlockReason:
        "This file needs customer likeness consent before production use.",
      limits: [],
      reason: "Likeness consent not confirmed by customer.",
    };
  }

  if (rights.thirdPartyMaterialPresent === true && !rights.thirdPartyRightsConfirmed) {
    return {
      routingState: "QUARANTINED",
      productionCleared: false,
      productionBlockReason:
        "This file needs customer third-party rights confirmation before production use.",
      limits: [],
      reason: "Third-party rights not confirmed by customer.",
    };
  }

  if (rightsMissingCropAdaptPermission(rights)) {
    return {
      routingState: "CLEARED_WITH_LIMITS",
      productionCleared: true,
      productionBlockReason: null,
      limits: ["no_crop_adapt"],
      reason: "Cleared with no crop/adapt permission.",
    };
  }

  if (categoryRequiresUseClearance(category) && rights.ownershipBasis) {
    return {
      routingState: "CLEARED_FOR_PRODUCTION",
      productionCleared: true,
      productionBlockReason: null,
      limits: [],
      reason: "Rights and technical checks passed for clearance category.",
    };
  }

  if (!categoryRequiresUseClearance(category)) {
    return {
      routingState: "CLEARED_FOR_PRODUCTION",
      productionCleared: true,
      productionBlockReason: null,
      limits: [],
      reason: "Technical checks passed for non-clearance category.",
    };
  }

  return {
    routingState: "RECEIVED",
    productionCleared: false,
    productionBlockReason: "File received; clearance decision pending.",
    limits: [],
    reason: "Default received state.",
  };
}

export function buildCustomerContentCertification(input: {
  category: MaterialCategory;
  technical: CustomerContentTechnicalInspection;
  rights: CustomerContentRightsRecord;
  evaluatedAt?: string;
  prior?: CustomerContentCertification | null;
  certificationId?: string;
  replacesCertificationId?: string;
}): CustomerContentCertification {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const resolved = resolveContentRoutingState({
    category: input.category,
    technical: input.technical,
    rights: input.rights,
    evaluatedAt,
  });
  const priorState = input.prior?.routingState ?? null;
  const certificationId =
    input.certificationId ?? input.prior?.certificationId ?? newContentCertificationId(evaluatedAt);

  return {
    schemaVersion: 1,
    packageId: PACKAGE_ID,
    certificationId,
    routingState: resolved.routingState,
    routingStateAt: evaluatedAt,
    technical: input.technical,
    rights: input.rights,
    productionCleared: resolved.productionCleared,
    productionBlockReason: resolved.productionBlockReason,
    limits: [...resolved.limits],
    replacesCertificationId: input.replacesCertificationId ?? input.prior?.replacesCertificationId,
    teamTechnicalReview: input.prior?.teamTechnicalReview,
    history: [
      ...(input.prior?.history ?? []),
      historyEntry(priorState, resolved.routingState, resolved.reason, evaluatedAt),
    ],
  };
}

export function contentRoutingLabel(state: ContentRoutingState): string {
  return CONTENT_ROUTING_LABELS[state];
}

export function markContentCertificationWithdrawn(
  certification: CustomerContentCertification,
  withdrawnAt?: string,
): CustomerContentCertification {
  const at = withdrawnAt ?? new Date().toISOString();
  return {
    ...certification,
    routingState: "WITHDRAWN_BY_CUSTOMER",
    routingStateAt: at,
    withdrawnAt: at,
    productionCleared: false,
    productionBlockReason: "Customer withdrew this file.",
    history: [
      ...certification.history,
      historyEntry(certification.routingState, "WITHDRAWN_BY_CUSTOMER", "Customer withdrew file.", at),
    ],
  };
}

export function markContentCertificationSuperseded(
  certification: CustomerContentCertification,
  supersededByMaterialId: string,
  evaluatedAt?: string,
): CustomerContentCertification {
  const at = evaluatedAt ?? new Date().toISOString();
  return {
    ...certification,
    routingState: "SUPERSEDED",
    routingStateAt: at,
    supersededByMaterialId,
    productionCleared: false,
    productionBlockReason: "A newer file replaced this upload.",
    history: [
      ...certification.history,
      historyEntry(certification.routingState, "SUPERSEDED", "Replaced by newer upload.", at),
    ],
  };
}

export function teamResolvesTechnicalContentReview(
  certification: CustomerContentCertification,
  category: MaterialCategory,
  evaluatedAt?: string,
): CustomerContentCertification {
  const at = evaluatedAt ?? new Date().toISOString();
  if (certification.routingState !== "TECHNICAL_REVIEW_REQUIRED") {
    return certification;
  }

  const technical: CustomerContentTechnicalInspection = {
    ...certification.technical,
    signatureMatch: true,
    supported: true,
    corrupt: false,
    passwordProtected: false,
    issues: [],
  };

  return buildCustomerContentCertification({
    category,
    technical,
    rights: certification.rights,
    evaluatedAt: at,
    prior: {
      ...certification,
      teamTechnicalReview: {
        clearedAt: at,
        clearedBy: "team",
        note: "Team resolved authorized technical-review condition.",
      },
    },
    certificationId: certification.certificationId,
  });
}

/** @deprecated Team approval cannot fabricate customer rights — use teamResolvesTechnicalContentReview. */
export function teamClearsContentCertification(
  certification: CustomerContentCertification,
  evaluatedAt?: string,
): CustomerContentCertification {
  const at = evaluatedAt ?? new Date().toISOString();
  if (certification.routingState === "REJECTED" || certification.routingState === "WITHDRAWN_BY_CUSTOMER") {
    return certification;
  }
  return {
    ...certification,
    routingState: certification.limits.length > 0 ? "CLEARED_WITH_LIMITS" : "CLEARED_FOR_PRODUCTION",
    routingStateAt: at,
    productionCleared: true,
    productionBlockReason: null,
    history: [
      ...certification.history,
      historyEntry(
        certification.routingState,
        certification.limits.length > 0 ? "CLEARED_WITH_LIMITS" : "CLEARED_FOR_PRODUCTION",
        "Team cleared file for production.",
        at,
      ),
    ],
  };
}
