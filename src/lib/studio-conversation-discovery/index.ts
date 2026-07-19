export type {
  DiscoveryAnswerActor,
  DiscoveryAnswersSlice,
  DiscoveryCapturedSummary,
  DiscoveryDeadlineInformation,
  DiscoveryFormTileId,
  DiscoveryMaterialsStatus,
  DiscoveryPresentationPayload,
  DiscoveryTabletStepId,
} from "./types";

export {
  DISCOVERY_DEADLINE_OPTIONS,
  DISCOVERY_TABLET_STEP_ORDER,
  discoveryTabletCoversAllFormTiles,
  discoveryTabletStepConfig,
  formatDiscoveryStepSummary,
  isDeadlineAnswerComplete,
  isDiscoveryFormTileId,
  isDiscoveryTabletComplete,
  isDiscoveryTabletStepComplete,
  resolveDiscoveryResumeStepIndex,
  type DiscoveryDeadlineOption,
  type DiscoveryTabletStepConfig,
} from "./steps";

export {
  bootDiscoveryWorkingDraft,
  readDeadlineFromDraft,
  readDiscoveryAnswersFromDraft,
  readMaterialsFromDraft,
  recordDiscoveryStepAnswer,
} from "./draft";

export {
  discoveryFactsFromAnswers,
  discoveryFactsFromDraft,
  isDiscoveryReadyForRouteRecommendation,
} from "./facts";

export { buildDiscoveryPresentationPayload } from "./presentation";
