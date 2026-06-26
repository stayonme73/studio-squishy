/**
 * Project Summary — public API.
 *
 * Architecture: Catalog → Recommendation Engine → Discovery Summary → Project Summary → Studio Board
 * Import from `@/project-summary` only; do not reach into submodules from UI.
 */

export type { DiscoveryAnswerHeardItem } from "@/project-summary/types";

export { PROJECT_SUMMARY_LABELS } from "@/project-summary/types";

export { buildDiscoveryAnswersHeard } from "@/project-summary/buildDiscoveryAnswersHeard";
