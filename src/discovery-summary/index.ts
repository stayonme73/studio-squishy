/**
 * Discovery Summary — public API.
 *
 * Architecture: Catalog → Recommendation Engine → Discovery Summary → Payment → Campaign Record
 * Import from `@/discovery-summary` only; do not reach into submodules from UI.
 */

export type {
  DiscoverySummaryDeliverable,
  DiscoverySummaryInvestment,
  DiscoverySummaryModel,
  DiscoverySummaryNextStep,
  DiscoverySummaryServiceItem,
  DiscoverySummaryTimeline,
  DiscoverySummaryTotalInvestment,
  DiscoverySummaryWarning,
} from "@/discovery-summary/types";

export { buildDiscoverySummary } from "@/discovery-summary/buildDiscoverySummary";

export {
  DiscoverySummaryValidationError,
  validateDiscoverySummaryModel,
} from "@/discovery-summary/validate";
