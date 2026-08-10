export { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";
export type { StudioPreAcceptanceOutcome } from "@/config/studio-pre-acceptance-v1";

export {
  buildPreAcceptancePaymentAuthorization,
  readAuthorizedPreAcceptanceDecisionId,
} from "./authorization-binding";
export type { PreAcceptancePaymentAuthorization } from "./authorization-binding";
export { evaluatePreAcceptance } from "./evaluate";
export { evaluateCapabilityForServices } from "./evaluate-capability";
export { evaluateMaterialClarification } from "./evaluate-clarification";
export { evaluateMaterialRiskPolicy } from "./evaluate-risk";
export {
  countBusinessDaysAfter,
  evaluateTimingTruth,
  parseCustomerDeadline,
  resolveRequiredMinBusinessDays,
} from "./evaluate-timing";
export { buildPreAcceptanceFactFingerprint } from "./fingerprint";
export { projectFactsFromWorkingDraft } from "./facts-from-draft";
export {
  assertPreAcceptanceAllowsPayment,
  isClearToAccept,
  runPreAcceptanceForCheckout,
} from "./payment-gate";
export {
  clearPersistedPreAcceptanceDecision,
  persistPreAcceptanceDecision,
  readPersistedPreAcceptanceDecision,
} from "./persist";
export type {
  PreAcceptanceClarificationVerdict,
  PreAcceptanceCapabilityVerdict,
  PreAcceptanceDecision,
  PreAcceptanceProjectFacts,
  PreAcceptanceRiskVerdict,
  PreAcceptanceSkuCapabilityResult,
  PreAcceptanceTimingVerdict,
} from "./types";
export type { PreAcceptancePaymentGateResult } from "./payment-gate";
