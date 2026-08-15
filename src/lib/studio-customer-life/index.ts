export { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
export { assembleCustomerLifeTruth } from "./assemble-truth";
export {
  answerCustomerLifeQuestion,
  classifyCustomerLifeQuestion,
} from "./answer-question";
export { bindFlyerIdentityToQaRecords, ensureFlyerMachineReviewBind } from "./machine-review-bind";
export type {
  CustomerLifeAnswer,
  CustomerLifeAskResult,
  CustomerLifePhase,
  CustomerLifeQuestionIntent,
  CustomerLifeRecoveryClass,
  CustomerLifeStall,
  CustomerLifeTruth,
} from "./types";
