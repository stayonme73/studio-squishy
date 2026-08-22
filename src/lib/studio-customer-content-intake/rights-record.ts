import { studioCustomerContentRightsAttestationV1 } from "@/config/studio-customer-content-rights-attestation-v1";
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

export const LIKENESS_HINT_PATTERNS: readonly RegExp[] = [
  /\bportrait\b/i,
  /\bheadshot\b/i,
  /\bteam[\s_-]?member\b/i,
  /\bperson\b/i,
  /\bface\b/i,
  /\blikeness\b/i,
];

export const THIRD_PARTY_HINT_PATTERNS: readonly RegExp[] = [
  /\blogo\b/i,
  /\btrademark\b/i,
  /\bbrand[\s_-]?label\b/i,
  /\bshelf\b/i,
  /\bpackaging\b/i,
  /\bsignage\b/i,
  /\bscreenshot\b/i,
];

export function filenameLikenessHint(fileName: string): boolean {
  return LIKENESS_HINT_PATTERNS.some((pattern) => pattern.test(fileName.trim()));
}

export function filenameThirdPartyHint(fileName: string): boolean {
  return THIRD_PARTY_HINT_PATTERNS.some((pattern) => pattern.test(fileName.trim()));
}

export function detectRightsFilenameContradiction(input: {
  fileName: string;
  recognizablePeoplePresent: boolean | null;
  thirdPartyMaterialPresent: boolean | null;
}): boolean {
  const likenessHint = filenameLikenessHint(input.fileName);
  const thirdPartyHint = filenameThirdPartyHint(input.fileName);
  return (
    (likenessHint && input.recognizablePeoplePresent === false) ||
    (thirdPartyHint && input.thirdPartyMaterialPresent === false)
  );
}

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

  const likenessFilenameHint = filenameLikenessHint(fileName);
  const thirdPartyFilenameHint = filenameThirdPartyHint(fileName);
  const recognizablePeoplePresent = clearanceRequired
    ? (input.rightsInput?.recognizablePeoplePresent ?? null)
    : false;
  const thirdPartyMaterialPresent = clearanceRequired
    ? (input.rightsInput?.thirdPartyMaterialPresent ?? null)
    : false;
  const commercialUsePermitted = clearanceRequired
    ? (input.rightsInput?.commercialUsePermitted ?? null)
    : true;
  const cropAdaptPermitted = clearanceRequired
    ? (input.rightsInput?.cropAdaptPermitted ?? null)
    : true;
  const likenessConsentConfirmed = input.rightsInput?.likenessConsentConfirmed === true;
  const thirdPartyRightsConfirmed = input.rightsInput?.thirdPartyRightsConfirmed === true;
  const rightsAnswersContradictFilenameHints = detectRightsFilenameContradiction({
    fileName,
    recognizablePeoplePresent,
    thirdPartyMaterialPresent,
  });

  const statementComplete = clearanceRequired
    ? Boolean(basis) &&
      commercialUsePermitted === true &&
      cropAdaptPermitted !== null &&
      recognizablePeoplePresent !== null &&
      thirdPartyMaterialPresent !== null
    : true;

  return {
    recordedAt,
    packageId: PACKAGE_ID,
    customerProvided: true,
    ownershipBasis: basis,
    campaignUsePermitted: commercialUsePermitted,
    cropAdaptPermitted,
    commercialUsePermitted,
    attributionRequired: input.rightsInput?.attributionRequired ?? null,
    statementComplete,
    likenessReviewRequired:
      recognizablePeoplePresent === true ||
      (recognizablePeoplePresent === null && likenessFilenameHint),
    thirdPartyMaterialReviewRequired:
      thirdPartyMaterialPresent === true ||
      (thirdPartyMaterialPresent === null && thirdPartyFilenameHint),
    likenessConsentConfirmed,
    thirdPartyRightsConfirmed,
    recognizablePeoplePresent,
    thirdPartyMaterialPresent,
    likenessFilenameHint,
    thirdPartyFilenameHint,
    rightsAnswersContradictFilenameHints,
    attestationTextVersion:
      input.rightsInput?.attestationTextVersion ?? studioCustomerContentRightsAttestationV1.version,
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
  if (rights.commercialUsePermitted !== true) return true;
  if (rights.cropAdaptPermitted === null) return true;
  if (rights.recognizablePeoplePresent === null) return true;
  if (rights.thirdPartyMaterialPresent === null) return true;
  return false;
}

export function technicalNeedsReview(inspection: CustomerContentTechnicalInspection): boolean {
  return !inspection.supported || !inspection.signatureMatch || inspection.issues.length > 0;
}
