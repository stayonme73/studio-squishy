/**
 * Studio Plan Review — public API.
 *
 * Architecture: Catalog → Recommendation Engine → Studio Plan Review → Payment → Campaign Record
 * Import from `@/studio-plan-review` only; do not reach into submodules from UI.
 */

export type {
  StudioPlanReviewCostSummary,
  StudioPlanReviewModel,
  StudioPlanReviewServiceItem,
} from "@/studio-plan-review/types";

export { STUDIO_PLAN_REVIEW_LABELS } from "@/studio-plan-review/types";

export { buildStudioPlanReview } from "@/studio-plan-review/buildStudioPlanReview";

export {
  addServiceToPlan,
  allocateSelectedServices,
  canSwapServices,
  computeAdditionalCostUsd,
  getAvailableServicesToAdd,
  getSameClassSwapCandidates,
  initialPlanState,
  removeServiceFromPlan,
  swapServiceInPlan,
  type PlanAllocation,
  type StudioPlanState,
} from "@/studio-plan-review/planState";
