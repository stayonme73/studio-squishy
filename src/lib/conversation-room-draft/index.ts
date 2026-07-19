export { bridgeConversationPlanToCampaign } from "./bridge-campaign";
export { prefillIntakeAnswersFromOpening } from "./prefill-intake";

export {
  bootConversationProjectDraft,
  guideDraftFromOpening,
  openingFromGuideDraft,
  persistAddService,
  persistConversationStage,
  persistOpeningAnswers,
  persistRemoveService,
  persistRouteRecommendation,
  persistSelectedRoute,
} from "./persist-project";

export {
  emptyOpeningAnswers,
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
