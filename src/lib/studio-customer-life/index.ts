export { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
export { assembleCustomerLifeTruth } from "./assemble-truth";
export {
  laterProjectPhaseOverridesRecovery,
  statusSummaryHasObsoleteContradiction,
  summarizeCustomerLifeStatus,
} from "./summarize-status";
export {
  answerCustomerLifeQuestion,
  classifyCustomerLifeQuestion,
} from "./answer-question";
export {
  bindFlyerIdentityToQaRecords,
  ensureFlyerMachineReviewBind,
  latestFlyerQaIsUnresolvedFail,
  resolveFlyerObserverPngRelativePath,
  resolveFlyerObserverPdfRelativePath,
} from "./machine-review-bind";
export {
  attachShortVideoArtifactToCustomerJob,
  bindShortVideoIdentityToQaRecords,
  ensureShortVideoMachineReviewBind,
  ensureShortVideoMachineReviewBindFromCampaign,
  latestShortVideoQaIsUnresolvedFail,
  readShortVideoHookReceipt,
  resolveShortVideoMp4AbsolutePath,
} from "./machine-short-video-review-bind";
export { ensureFootageEditingMachineReviewBindFromCampaign } from "./machine-footage-editing-review-bind";
export { ensureClipRepurposingMachineReviewBindFromCampaign } from "./machine-clip-repurposing-review-bind";
export { ensureCopyMachineReviewBind } from "./machine-copy-review-bind";
export {
  askCustomerLifeFromStore,
  handleCustomerBoardQuestion,
  readCustomerLifeStatus,
} from "./ask";
export { studioCustomerCommunicationEmailMapV1 } from "./email-capability-map";
export type {
  CustomerLifeAnswer,
  CustomerLifeAskResult,
  CustomerLifePhase,
  CustomerLifeQaState,
  CustomerLifeQuestionIntent,
  CustomerLifeRecoveryClass,
  CustomerLifeStall,
  CustomerLifeTruth,
  CustomerLifeWaitingOn,
} from "./types";
