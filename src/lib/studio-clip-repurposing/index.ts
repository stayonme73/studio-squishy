export {
  CLIP_REPURPOSING_SKU,
  STUDIO_CLIP_REPURPOSING_BUILD_PACKAGE_ID,
  isClipRepurposingSku,
  studioClipRepurposingBuildV1,
} from "@/config/studio-clip-repurposing-build-v1";

export {
  applyPerformanceNotes,
  applySetRevision,
  contentTokens,
  corePoint,
  discoverClipSet,
  sharedPhrase,
  tokenJaccard,
} from "./set-discovery";
export {
  fixtureNoHookWordsSource,
  fixtureRepetitiveSource,
  fixtureStrongSource,
  fixtureTwoClipSource,
  fixtureWeakSource,
} from "./fixtures";
export { MIN_SEMANTIC_VIABLE, scoreSemanticValue } from "./semantic-value";
export {
  resolveClipRepurposingCustomerOutcome,
  clipSetWouldQuietlyUnderDeliver,
} from "./customer-outcome";
export { runClipRepurposingCustomerPipeline } from "./customer-pipeline";
export type {
  ClipRepurposingViableCount,
  LongSourceSentences,
  PerformanceWindowNote,
  SetCandidate,
  SetCandidateRejection,
  SetDiscoveryFailure,
  SetDiscoveryResult,
  SetDiscoverySuccess,
  SetRevision,
} from "./types";
