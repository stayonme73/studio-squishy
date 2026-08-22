import type { MaterialUseAuthorizationBasis } from "@/config/studio-material-use-v1";
import type { MaterialCategory } from "@/lib/materials/types";

export type ContentRoutingState =
  | "RECEIVED"
  | "RIGHTS_INFORMATION_REQUIRED"
  | "TECHNICAL_REVIEW_REQUIRED"
  | "CLEARED_FOR_PRODUCTION"
  | "CLEARED_WITH_LIMITS"
  | "QUARANTINED"
  | "REJECTED"
  | "SUPERSEDED"
  | "WITHDRAWN_BY_CUSTOMER";

export type CustomerContentTechnicalInspection = {
  inspectedAt: string;
  packageId: string;
  originalFileName: string;
  declaredMimeType: string;
  verifiedMimeType: string | null;
  signatureMatch: boolean;
  byteSize: number;
  sha256: string;
  imageWidth: number | null;
  imageHeight: number | null;
  corrupt: boolean;
  supported: boolean;
  passwordProtected: boolean;
  duplicateOfSha256: string | null;
  issues: readonly string[];
};

export type CustomerContentRightsRecord = {
  recordedAt: string;
  packageId: string;
  customerProvided: boolean;
  ownershipBasis: MaterialUseAuthorizationBasis | null;
  campaignUsePermitted: boolean | null;
  cropAdaptPermitted: boolean | null;
  commercialUsePermitted: boolean | null;
  attributionRequired: boolean | null;
  statementComplete: boolean;
  likenessReviewRequired: boolean;
  thirdPartyMaterialReviewRequired: boolean;
  /** Customer-only attestation — team approval cannot substitute. */
  likenessConsentConfirmed: boolean;
  /** Customer-only attestation — team approval cannot substitute. */
  thirdPartyRightsConfirmed: boolean;
};

export type CustomerContentTeamTechnicalReview = {
  clearedAt: string;
  clearedBy: "team";
  note?: string;
};

export type CustomerContentRoutingHistoryEntry = {
  at: string;
  from: ContentRoutingState | null;
  to: ContentRoutingState;
  reason: string;
};

export type CustomerContentCertification = {
  schemaVersion: 1;
  packageId: string;
  certificationId: string;
  routingState: ContentRoutingState;
  routingStateAt: string;
  technical: CustomerContentTechnicalInspection;
  rights: CustomerContentRightsRecord;
  productionCleared: boolean;
  productionBlockReason: string | null;
  limits: readonly string[];
  history: readonly CustomerContentRoutingHistoryEntry[];
  replacesCertificationId?: string;
  supersededByCertificationId?: string;
  supersededByMaterialId?: string;
  withdrawnAt?: string;
  teamTechnicalReview?: CustomerContentTeamTechnicalReview;
};

export type CustomerContentRightsInput = {
  useAuthorizationBasis?: MaterialUseAuthorizationBasis;
  cropAdaptPermitted?: boolean;
  commercialUsePermitted?: boolean;
  attributionRequired?: boolean;
  likenessConsentConfirmed?: boolean;
  thirdPartyRightsConfirmed?: boolean;
};

export type CertifyCustomerMaterialUploadInput = {
  item: {
    id: string;
    category: MaterialCategory;
    contentKind: string;
    fileName?: string;
    useAuthorization?: CustomerContentRightsRecord["ownershipBasis"] extends infer _T
      ? { basis: MaterialUseAuthorizationBasis; attestedAt?: string }
      : never;
  };
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  checksumSha256: string;
  campaignId: string;
  rightsInput?: CustomerContentRightsInput;
  evaluatedAt?: string;
  priorCertification?: CustomerContentCertification | null;
};
