"use client";

import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";

type Props = {
  selectedCount: number;
  totalDisplay: string;
  canReview: boolean;
  onReview: () => void;
};

/** Project Summary — stats + next action integrated into the header workspace. */
export default function ProjectBuilderSummaryRail({
  selectedCount,
  totalDisplay,
  canReview,
  onReview,
}: Props) {
  const summaryHint =
    selectedCount === 0
      ? PROJECT_BUILDER_V1.emptySelectionHint
      : canReview
        ? PROJECT_BUILDER_V1.reviewStudioPlanReadyHint
        : null;

  return (
    <div className="pb-header__summary" aria-label={PROJECT_BUILDER_V1.summaryHeading}>
      <p className="pb-header__summary-title">{PROJECT_BUILDER_V1.summaryHeading}</p>

      <div className="pb-header__summary-main">
        <dl className="pb-header__summary-stats">
          <div className="pb-header__summary-stat">
            <dt>{PROJECT_BUILDER_V1.selectedCountLabel}</dt>
            <dd>{selectedCount}</dd>
          </div>
          <div className="pb-header__summary-stat pb-header__summary-stat--total">
            <dt>{PROJECT_BUILDER_V1.totalLabel}</dt>
            <dd>{totalDisplay}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="utility-btn utility-btn--primary pb-header__summary-cta"
          disabled={!canReview}
          onClick={onReview}
          aria-describedby={summaryHint ? "pb-summary-action-hint" : undefined}
        >
          {PROJECT_BUILDER_V1.reviewStudioPlanCta}
        </button>
      </div>

      {summaryHint ? (
        <p
          id="pb-summary-action-hint"
          className={[
            "pb-header__summary-hint",
            canReview && selectedCount > 0 ? "pb-header__summary-hint--ready" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {summaryHint}
        </p>
      ) : null}
    </div>
  );
}
