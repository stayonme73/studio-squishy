export { bridgeConversationPlanToCampaign } from "./bridge-campaign";
export {
  clearCompletedConversationLocalState,
  clearConversationGuideLocals,
  isConversationJourneyComplete,
  resolveLobbyConversationBeginInvite,
  type LobbyConversationBeginInvite,
} from "./lobby-begin";
export {
  diffIntakeAnswers,
  intakeBusinessNameCarryForward,
  recordIntakeAnswerChanges,
  recordIntakeSubmission,
  INTAKE_ATTRIBUTION_ACTION,
} from "./intake-attribution";
export { prefillIntakeAnswersFromOpening } from "./prefill-intake";

export {
  bootConversationProjectDraft,
  guideDraftFromOpening,
  openingFromGuideDraft,
  clearRouteRecommendation,
  persistAddService,
  persistConversationStage,
  persistOpeningAnswers,
  persistRemoveService,
  persistRouteRecommendation,
  persistSelectedRoute,
} from "./persist-project";

export {
  emptyOpeningAnswers,
  readActiveRouteRecommendation,
  readConversationStage,
  readOpeningAnswers,
  readRouteRecommendation,
  readSelectedRoute,
  readSelectedServices,
  selectedJobIdSet,
  withConversationStage,
  type OpeningAnswersSlice,
  type RouteRecommendationSlice,
  type SelectedRouteSlice,
  type SelectedServiceSlice,
} from "./slices";
