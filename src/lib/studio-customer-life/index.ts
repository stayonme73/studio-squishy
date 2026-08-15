export { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
export { assembleCustomerLifeTruth } from "./assemble-truth";
export {
  answerCustomerLifeQuestion,
  classifyCustomerLifeQuestion,
} from "./answer-question";
export {
  bindFlyerIdentityToQaRecords,
  ensureFlyerMachineReviewBind,
  resolveFlyerObserverPngRelativePath,
} from "./machine-review-bind";
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
