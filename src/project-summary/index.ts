/**
 * Project Summary — public API.
 *
 * Architecture: Catalog → Recommendation Engine → Discovery Summary → Project Summary → Studio Board
 * Import from `@/project-summary` only; do not reach into submodules from UI.
 */

export type {
  DiscoveryAnswerHeardItem,
  PanelPhase,
  ProjectSummaryMockPackage,
  ProjectSummaryMockService,
} from "@/project-summary/types";

export {
  DISCOVERY_SPLIT_PREVIEW_LABELS,
  PROJECT_SUMMARY_LABELS,
  PROJECT_SUMMARY_MOCK,
} from "@/project-summary/types";

export { buildDiscoveryAnswersHeard } from "@/project-summary/buildDiscoveryAnswersHeard";
