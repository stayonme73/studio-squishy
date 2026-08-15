export { studioReviewRevisionFullLoopV1 } from "@/config/studio-review-revision-full-loop-v1";
export type { MachineFlyerRevisionEmphasis } from "@/config/studio-review-revision-full-loop-v1";
export {
  applyExistingCtaHeadlineEmphasis,
  buildMachineFlyerRevisionEmphasis,
  collectRevisionInstruction,
  currentFlyerWorkVersionId,
  customerFacingVersionLabel,
  shouldEmphasizeExistingCtaAsHeadline,
} from "./flyer-revision-emphasis";
export {
  assembleApprovedFlyerClientDelivery,
} from "./assemble-approved-delivery";
export {
  FLYER_INCLUDED_SLOT_TRUTH,
  classifyFlyerIncludedSlot,
  clientDeliveryFileLabelsForSku,
  customerPromisedFileLabels,
  customerReviewDeliverableLabels,
  customerVisiblePurchaseLabels,
  customerVisiblePurchaseLabelsForSku,
  flyerCoordinatedExportApprovalLaw,
} from "./flyer-purchase-delivery-truth";
export { presentFlyerReviewProof, reviewProofAlreadyPresented } from "./present-flyer-review";
export { contentSha256Hex, normalizeContentSha256, sameContentSha256 } from "./hash";
