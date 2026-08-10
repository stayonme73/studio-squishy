export { studioApprovedDeliveryV1 } from "@/config/studio-approved-delivery-v1";
export type { StudioApprovedDeliveryOutcome } from "@/config/studio-approved-delivery-v1";

export {
  buildFinalDeliveryAuthorizationRecord,
  evaluateApprovalMatchForRelease,
  evaluateDeliveryEligibility,
  isEligibleForDelivery,
  stampClientDeliveryFilesWithApproval,
} from "./evaluate";

export {
  buildCustomerApprovedArtifactAuthorization,
  qaPinMatchesCustomerApproval,
  setsEqual,
  sortedUnique,
} from "./pin";

export type {
  CustomerApprovedArtifactAuthorization,
  DeliveryCandidateRef,
  DeliveryEligibilityBlockCode,
  DeliveryEligibilityDecision,
  FinalDeliveryAuthorizationRecord,
} from "./types";
