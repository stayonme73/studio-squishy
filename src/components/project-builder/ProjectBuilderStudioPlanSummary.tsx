"use client";

import { useState } from "react";

import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import type { RouteMapJobId } from "@/config/route-map-v1";
import type { ProjectBuilderStudioPlanSummaryModel } from "@/lib/project-builder-studio-plan-summary";

type Props = {
  model: ProjectBuilderStudioPlanSummaryModel;
  onEditProject: () => void;
  onContinueToCheckout: () => void;
  onViewScope: (jobId: RouteMapJobId) => void;
};

/** Project-level Studio Plan summary — concise scope; full details stay in Learn More. */
export default function ProjectBuilderStudioPlanSummary({
  model,
  onEditProject,
  onContinueToCheckout,
  onViewScope,
}: Props) {
  const [revisionDetailsOpen, setRevisionDetailsOpen] = useState(false);

  return (
    <div className="pb-plan-summary" aria-label={PROJECT_BUILDER_V1.studioPlanHeading}>
      <section className="pb-plan-summary__card pb-plan-summary__card--route">
        <p className="pb-plan-summary__eyebrow">{PROJECT_BUILDER_V1.routeContextEyebrow}</p>
        <p className="pb-plan-summary__route">{model.routeLabel}</p>
      </section>

      {model.emptyMessage ? (
        <p className="pb-plan-summary__empty" role="status">
          {model.emptyMessage}
        </p>
      ) : null}

      <section
        className="pb-plan-summary__card"
        aria-labelledby="pb-plan-deliverables-title"
      >
        <h3 id="pb-plan-deliverables-title" className="pb-plan-summary__heading">
          {PROJECT_BUILDER_V1.planDeliverablesHeading}
        </h3>
        {model.deliverables.length === 0 ? (
          <p className="pb-plan-summary__muted">{PROJECT_BUILDER_V1.emptySelectionHint}</p>
        ) : (
          <ul className="pb-plan-summary__deliverables">
            {model.deliverables.map((item) => (
              <li key={item.serviceId} className="pb-plan-summary__deliverable">
                <div className="pb-plan-summary__deliverable-head">
                  <p className="pb-plan-summary__deliverable-title">{item.title}</p>
                  <p className="pb-plan-summary__deliverable-price">{item.priceDisplay}</p>
                </div>
                <p className="pb-plan-summary__deliverable-scope">{item.scopeSummary}</p>
                <button
                  type="button"
                  className="pb-plan-summary__view-scope"
                  onClick={() => onViewScope(item.serviceId)}
                >
                  {PROJECT_BUILDER_V1.viewScopeCta}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pb-plan-summary__card pb-plan-summary__card--total" aria-labelledby="pb-plan-total-title">
        <h3 id="pb-plan-total-title" className="pb-plan-summary__heading">
          {PROJECT_BUILDER_V1.totalLabel}
        </h3>
        <p className="pb-plan-summary__total">{model.totalDisplay}</p>
      </section>

      <section className="pb-plan-summary__card" aria-labelledby="pb-plan-timeline-title">
        <h3 id="pb-plan-timeline-title" className="pb-plan-summary__heading">
          {PROJECT_BUILDER_V1.planTimelineHeading}
        </h3>
        {model.overallTimelineDisplay ? (
          <div className="pb-plan-summary__timeline-block">
            <p className="pb-plan-summary__subheading">{PROJECT_BUILDER_V1.planTimelineOverallLabel}</p>
            <p className="pb-plan-summary__prose">{model.overallTimelineDisplay}</p>
          </div>
        ) : null}
        {model.deliverableTimelines.length > 0 ? (
          <div className="pb-plan-summary__timeline-block">
            <p className="pb-plan-summary__subheading">{PROJECT_BUILDER_V1.planTimelineDeliverablesLabel}</p>
            <ul className="pb-plan-summary__timeline-list">
              {model.deliverableTimelines.map((item) => (
                <li key={item.title} className="pb-plan-summary__timeline-row">
                  <span className="pb-plan-summary__timeline-name">{item.title}</span>
                  <span className="pb-plan-summary__timeline-value">{item.timingDisplay}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="pb-plan-summary__card" aria-labelledby="pb-plan-revision-title">
        <h3 id="pb-plan-revision-title" className="pb-plan-summary__heading">
          {PROJECT_BUILDER_V1.planRevisionHeading}
        </h3>
        <ul className="pb-plan-summary__list pb-plan-summary__list--compact">
          {model.revisionPolicySummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button
          type="button"
          className="pb-plan-summary__policy-toggle"
          aria-expanded={revisionDetailsOpen}
          onClick={() => setRevisionDetailsOpen((open) => !open)}
        >
          {revisionDetailsOpen
            ? PROJECT_BUILDER_V1.hideRevisionPolicyCta
            : PROJECT_BUILDER_V1.viewRevisionPolicyCta}
        </button>
        {revisionDetailsOpen ? (
          <ul className="pb-plan-summary__list pb-plan-summary__list--detail">
            {model.revisionPolicyFull.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="pb-plan-summary__card" aria-labelledby="pb-plan-responsibilities-title">
        <h3 id="pb-plan-responsibilities-title" className="pb-plan-summary__heading">
          {PROJECT_BUILDER_V1.planResponsibilitiesHeading}
        </h3>
        {model.consolidatedRequirements.length === 0 ? (
          <p className="pb-plan-summary__muted">{PROJECT_BUILDER_V1.planResponsibilitiesEmpty}</p>
        ) : (
          <>
            <p className="pb-plan-summary__prose">{PROJECT_BUILDER_V1.planResponsibilitiesIntro}</p>
            <ul className="pb-plan-summary__list pb-plan-summary__list--compact pb-plan-summary__list--requirements">
              {model.consolidatedRequirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="pb-plan-summary__actions">
        <button
          type="button"
          className="utility-btn utility-btn--secondary pb-plan-summary__action pb-plan-summary__action--edit"
          onClick={onEditProject}
        >
          {PROJECT_BUILDER_V1.editProjectCta}
        </button>
        <button
          type="button"
          className="utility-btn utility-btn--primary pb-plan-summary__action pb-plan-summary__action--primary"
          disabled={!model.canContinue}
          onClick={onContinueToCheckout}
        >
          {PROJECT_BUILDER_V1.continueToCheckoutCta}
        </button>
      </div>
    </div>
  );
}
