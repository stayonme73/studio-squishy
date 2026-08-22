import type { ContentRoutingState, CustomerContentRightsRecord } from "./types";

export function contentRoutingExplanation(input: {
  routingState: ContentRoutingState;
  productionBlockReason: string | null;
  rights?: CustomerContentRightsRecord;
}): string {
  const { routingState, productionBlockReason, rights } = input;

  switch (routingState) {
    case "CLEARED_FOR_PRODUCTION":
      return "This file passed your rights confirmations and technical checks. The Studio may use it in production for your project.";
    case "CLEARED_WITH_LIMITS":
      return "This file is cleared with limits. The Studio may use it in production, but not with crop or adapt changes.";
    case "RIGHTS_INFORMATION_REQUIRED":
      return "Complete every per-file rights confirmation before this file can be used in production.";
    case "TECHNICAL_REVIEW_REQUIRED":
      return "The Studio is reviewing a technical issue with this file before production use.";
    case "QUARANTINED":
      if (rights?.rightsAnswersContradictFilenameHints) {
        return "Your answers do not match signals in this file name. The Studio will review this file before production use.";
      }
      if (rights?.recognizablePeoplePresent === true && !rights.likenessConsentConfirmed) {
        return "Recognizable people appear in this file, but likeness consent is not confirmed yet.";
      }
      if (rights?.thirdPartyMaterialPresent === true && !rights.thirdPartyRightsConfirmed) {
        return "Third-party protected material appears in this file, but commercial-use authority is not confirmed yet.";
      }
      return "The Studio must review this file before production use.";
    case "REJECTED":
      return productionBlockReason ?? "This file was rejected and cannot be used in production.";
    case "SUPERSEDED":
      return "A newer file replaced this upload. Only the current file may be used in production.";
    case "WITHDRAWN_BY_CUSTOMER":
      return "You withdrew this file. It is no longer cleared for production use.";
    case "RECEIVED":
    default:
      return "This file was received and is waiting for review.";
  }
}
