export {
  studioAutonomousProductionLoopV1,
  PRODUCTION_FAILURE_CLASS_STANDARDS,
} from "@/config/studio-autonomous-production-loop-v1";
export type {
  FlyerReasoningConstraints,
  ProductionFailureClass,
} from "@/config/studio-autonomous-production-loop-v1";

export { buildProductionCorrectionBrief } from "./brief";
export {
  appendInternalAttempt,
  beginNewAttemptSequence,
  createInternalProductionLoop,
  currentSequenceAttempts,
  nextAttemptTriggeredBy,
  remainingInternalAttempts,
  resolveWorkingProductionLoop,
  isTechnicalOnlyExhaustion,
  isInternalLoopExhausted,
  wouldExceedInternalAttemptBudget,
  readInternalProductionLoopFile,
  writeInternalProductionLoopFile,
  loopLedgerRelativePath,
} from "./ledger";
export {
  classifyFindingId,
  classifyPipelineFailureCode,
  classifyQualityFindings,
  constraintsForClasses,
  mergeFlyerReasoningConstraints,
  constraintsFromBrief,
  emptyFlyerReasoningConstraints,
  uniqueClasses,
} from "./types";
export type {
  InternalProductionAttemptRecord,
  InternalProductionLoopOrigin,
  InternalProductionLoopRecord,
  ProductionCorrectionBrief,
  ProductionCorrectionFinding,
} from "./types";
