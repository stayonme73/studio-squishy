import { studioExternalCustomerContentIntakeAndRightsCertificationV1 } from "@/config/studio-external-customer-content-intake-and-rights-certification-v1";
import type { MaterialUseAuthorizationBasis } from "@/config/studio-material-use-v1";
import { categoryRequiresUseClearance } from "@/lib/studio-material-use";
import type { MaterialCategory } from "@/lib/materials/types";

import type {
  CustomerContentRightsInput,
  CustomerContentRightsRecord,
  CustomerContentTechnicalInspection,
} from "./types";

const PACKAGE_ID = studioExternalCustomerContentIntakeAndRightsCertificationV1.packageId;

const LIKENESS_HINT_PATTERNS: readonly RegExp[] = [
  /\bportrait\b/i,
  /\bheadshot\b/i,
  /\bteam[\s_-]?member\b/i,
  /\bperson\b/i,
  /\bface\b/i,
  /\blikeness\b/i,
];

const THIRD_PARTY_HINT_PATTERNS: readonly RegExp[] = [
  /\blogo\b/i,
  /\btrademark\b/i,
  /\bbrand[\s_-]?label\b/i,
  /\bshelf\b/i,
  /\bpackaging\b/i,
  /\bsignage\b/i,
  /\bscreenshot\b/i,
];

export function buildCustomerContentRightsRecord(input: {
  category: MaterialCategory;
  fileName: string;
  rightsInput?: CustomerContentRightsInput;
  useAuthorizationBasis?: MaterialUseAuthorizationBasis;
  recordedAt?: string;
}): CustomerContentRightsRecord {
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const basis =
    input.rightsInput?.useAuthorizationBasis ?? input.useAuthorizationBasis ?? null;
  const clearanceRequired = categoryRequiresUseClearance(input.category);
  const fileName = input.fileName.trim();

  const likenessReviewRequired = LIKENESS_HINT_PATTERNS.some((pattern) => pattern.test(fileName));
  const thirdPartyMaterialReviewRequired = THIRD_PARTY_HINT_PATTERNS.some((pattern) =>
    pattern.test(fileName),
  );

  const campaignUsePermitted =
    input.rightsInput?.commercialUsePermitted ??
    (basis ? true : clearanceRequired ? null : true);
  const cropAdaptPermitted =
    input.rightsInput?.cropAdaptPermitted ?? (clearanceRequired ? null : true);
  const commercialUsePermitted =
    input.rightsInput?.commercialUsePermitted ?? (basis ? true : clearanceRequired ? null : true);

  const statementComplete = clearanceRequired
    ? Boolean(basis) &&
      campaignUsePermitted !== null &&
      cropAdaptPermitted !== null &&
      commercialUsePermitted !== null
    : true;

  return {
    recordedAt,
    packageId: PACKAGE_ID,
    customerProvided: true,
    ownershipBasis: basis,
    campaignUsePermitted,
    cropAdaptPermitted,
    commercialUsePermitted,
    attributionRequired: input.rightsInput?.attributionRequired ?? null,
    statementComplete,
    likenessReviewRequired,
    thirdPartyMaterialReviewRequired,
    likenessConsentConfirmed: input.rightsInput?.likenessConsentConfirmed === true,
    thirdPartyRightsConfirmed: input.rightsInput?.thirdPartyRightsConfirmed === true,
  };
}

export function rightsMissingCropAdaptPermission(rights: CustomerContentRightsRecord): boolean {
  return rights.cropAdaptPermitted === false;
}

export function rightsNeedFollowUp(
  rights: CustomerContentRightsRecord,
  category: MaterialCategory,
): boolean {
  if (!categoryRequiresUseClearance(category)) return false;
  if (!rights.ownershipBasis) return true;
  if (!rights.statementComplete) return true;
  return false;
}

export function technicalNeedsReview(inspection: CustomerContentTechnicalInspection): boolean {
  return !inspection.supported || !inspection.signatureMatch || inspection.issues.length > 0;
}
