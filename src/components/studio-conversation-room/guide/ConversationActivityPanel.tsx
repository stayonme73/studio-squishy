"use client";

import { useState } from "react";

import ProjectBuilderJobDetailBlocks from "@/components/project-builder/ProjectBuilderJobDetailBlocks";
import "@/components/project-builder/project-builder-job-details.css";
import ConversationCheckoutPanel from "@/components/studio-conversation-room/guide/ConversationCheckoutPanel";
import ConversationIntakePanel from "@/components/studio-conversation-room/guide/ConversationIntakePanel";
import ConversationStudioPlanPanel from "@/components/studio-conversation-room/guide/ConversationStudioPlanPanel";
import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
import type { ActivityPanelId } from "@/config/conversation-room-stage-v1";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import {
  getJobsForRoad,
  getRouteMapRoad,
  type RouteMapJob,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { resolveProjectBuilderDrawerTagline } from "@/lib/project-builder-drawer-tagline";
import { expandScannableCopyItems } from "@/lib/project-builder-scannable-copy";
import { buildProjectBuilderStudioPlanSummary } from "@/lib/project-builder-studio-plan-summary";
import { resolveProjectBuilderJobPresentation } from "@/lib/project-builder-update-exit-copy";
import type { ServiceId } from "@/catalog/types";
import type { RouteMapIntakeAnswers } from "@/catalog/intake";

export type ConversationActivityPanelProps = {
  /** Slide content id — never `none` or `help` (Help uses distinct chrome). */
  panel: Exclude<ActivityPanelId, "none" | "help">;
  selectedRoadId: RouteMapRoadId | null;
  detailJobId: RouteMapJobId | null;
  selectedJobIds: ReadonlySet<RouteMapJobId>;
  onClose: () => void;
  onBackToRoutes: () => void;
  onOpenLearnMore: (jobId: RouteMapJobId) => void;
  onBackToServices: () => void;
  onAddJob: (jobId: RouteMapJobId) => void;
  onRemoveJob: (jobId: RouteMapJobId) => void;
  onReviewStudioPlan: () => void;
  onBackToStudioPlan: () => void;
  onCheckoutPaymentComplete: () => void;
  onIntakeSubmitSuccess: () => void;
  onRecoverIntakePayment?: () => void;
  intakePrefillBusinessName?: string | null;
  onIntakeAnswersChange?: (answers: RouteMapIntakeAnswers) => void;
  /** Back label when Learn More was opened from Studio Plan vs Builder. */
  learnMoreBackLabel: string;
};

function formatEstimate(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function ServiceList({
  roadId,
  selectedJobIds,
  onClose,
  onBackToRoutes,
  onOpenLearnMore,
  onAddJob,
  onRemoveJob,
  onReviewStudioPlan,
}: {
  roadId: RouteMapRoadId;
  selectedJobIds: ReadonlySet<RouteMapJobId>;
  onClose: () => void;
  onBackToRoutes: () => void;
  onOpenLearnMore: (jobId: RouteMapJobId) => void;
  onAddJob: (jobId: RouteMapJobId) => void;
  onRemoveJob: (jobId: RouteMapJobId) => void;
  onReviewStudioPlan: () => void;
}) {
  const v = conversationRoomGuideV1;
  const road = getRouteMapRoad(roadId);
  const jobs = getJobsForRoad(roadId);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<RouteMapJobId>>(
    () => new Set(),
  );

  const selectedJobs = jobs.filter((job) => selectedJobIds.has(job.id));
  const selectedCount = selectedJobs.length;
  const estimateCents = selectedJobs.reduce((sum, job) => sum + job.priceCents, 0);

  function toggleExpanded(jobId: RouteMapJobId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  return (
    <div className={styles.sheet} data-panel="builder">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {road
              ? `${road.highwayLabel} — ${road.customerLabel}`
              : "Your route"}
          </p>
          <h2 className={styles.title}>{v.servicesPanelTitle}</h2>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close activity panel"
        >
          Close
        </button>
      </header>

      <p className={styles.intro}>{v.servicesPanelLead}</p>

      <div className={styles.builderToolbar}>
        <button type="button" className={styles.backLink} onClick={onBackToRoutes}>
          ← {v.servicesBackToRoutesLabel}
        </button>
        <div className={styles.builderSummaryStack}>
          <p className={styles.builderSummary}>
            {PROJECT_BUILDER_V1.selectedCountLabel}: {selectedCount}
          </p>
          <p className={styles.builderSummary}>
            {PROJECT_BUILDER_V1.totalLabel}: {formatEstimate(estimateCents)}
          </p>
        </div>
      </div>

      <div className={styles.jobList}>
        {jobs.map((job) => {
          const inProject = selectedJobIds.has(job.id);
          const expanded = expandedIds.has(job.id);
          const includes = expandScannableCopyItems(job.deliverables);
          const tagline =
            resolveProjectBuilderJobPresentation(job, roadId).tagline ||
            resolveProjectBuilderDrawerTagline(job);

          return (
            <article
              key={job.id}
              className={styles.jobCard}
              data-selected={inProject ? "true" : "false"}
              data-expanded={expanded ? "true" : "false"}
            >
              <div className={styles.jobTop}>
                <h3 className={styles.jobName}>{job.name}</h3>
                <p className={styles.jobPrice}>{job.priceDisplay}</p>
              </div>
              <p className={styles.jobPurpose}>{job.purpose}</p>

              <button
                type="button"
                className={styles.expandToggle}
                aria-expanded={expanded}
                onClick={() => toggleExpanded(job.id)}
              >
                {expanded ? "Hide key details ▲" : "Show key details ▼"}
              </button>

              {expanded ? (
                <div className={styles.jobExpand}>
                  <p className={styles.jobBestFor}>
                    <span className={styles.jobBestForLabel}>
                      {PROJECT_BUILDER_V1.bestForLabel}
                    </span>{" "}
                    {tagline}
                  </p>
                  {includes.length > 0 ? (
                    <>
                      <p className={styles.jobExpandHeading}>Included</p>
                      <ul className={styles.jobExpandList}>
                        {includes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.jobActions}>
                <button
                  type="button"
                  className={styles.learnLink}
                  onClick={() => onOpenLearnMore(job.id)}
                >
                  {PROJECT_BUILDER_V1.learnMoreCta} →
                </button>
                {inProject ? (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onRemoveJob(job.id)}
                  >
                    {PROJECT_BUILDER_V1.removeFromProjectCta}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => onAddJob(job.id)}
                  >
                    {PROJECT_BUILDER_V1.addToProjectCta}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {selectedCount > 0 ? (
        <div className={styles.builderFooter}>
          <button
            type="button"
            className={styles.primary}
            onClick={onReviewStudioPlan}
          >
            {v.servicesReviewPlanCta}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LearnMoreView({
  job,
  roadId,
  inProject,
  onClose,
  onBackToServices,
  onAddJob,
  onRemoveJob,
  backLabel,
}: {
  job: RouteMapJob;
  roadId: RouteMapRoadId;
  inProject: boolean;
  onClose: () => void;
  onBackToServices: () => void;
  onAddJob: (jobId: RouteMapJobId) => void;
  onRemoveJob: (jobId: RouteMapJobId) => void;
  backLabel: string;
}) {
  const presentation = resolveProjectBuilderJobPresentation(job, roadId);
  const tagline =
    presentation.tagline || resolveProjectBuilderDrawerTagline(job);

  return (
    <div className={styles.sheet} data-panel="learnMore">
      <div className={styles.learnMorePinned}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{PROJECT_BUILDER_V1.learnMoreCta}</p>
            <h2 className={styles.title}>{presentation.name}</h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close activity panel"
          >
            Close
          </button>
        </header>

        <button
          type="button"
          className={styles.backLink}
          onClick={onBackToServices}
        >
          ← {backLabel}
        </button>

        <div className={styles.learnMoreMeta}>
          <div className={styles.bestFor}>
            <p className={styles.bestForLabel}>{PROJECT_BUILDER_V1.bestForLabel}</p>
            <p className={styles.bestForText}>{tagline}</p>
          </div>
          <p className={styles.jobPriceLarge}>{job.priceDisplay}</p>
          <p className={styles.scopeNote}>
            Scope and timing below apply to this service only — not your full
            project timeline.
          </p>
        </div>
      </div>

      <div className={styles.learnMoreScroll}>
        <div className={`${styles.learnMoreDoc} pb-job-details-surface`}>
          <ProjectBuilderJobDetailBlocks job={job} roadId={roadId} />
        </div>
      </div>

      <div className={styles.actions}>
        {inProject ? (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => onRemoveJob(job.id)}
          >
            {PROJECT_BUILDER_V1.removeFromProjectCta}
          </button>
        ) : (
          <button
            type="button"
            className={styles.primary}
            onClick={() => onAddJob(job.id)}
          >
            {PROJECT_BUILDER_V1.addToProjectDrawerCta}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * One Activity Panel shell — content swaps by `panel` id.
 * Checkout / Intake remain reserved until those packages land.
 */
export default function ConversationActivityPanel({
  panel,
  selectedRoadId,
  detailJobId,
  selectedJobIds,
  onClose,
  onBackToRoutes,
  onOpenLearnMore,
  onBackToServices,
  onAddJob,
  onRemoveJob,
  onReviewStudioPlan,
  onBackToStudioPlan,
  onCheckoutPaymentComplete,
  onIntakeSubmitSuccess,
  onRecoverIntakePayment,
  intakePrefillBusinessName = null,
  onIntakeAnswersChange,
  learnMoreBackLabel,
}: ConversationActivityPanelProps) {
  if (panel === "builder" && selectedRoadId) {
    return (
      <ServiceList
        roadId={selectedRoadId}
        selectedJobIds={selectedJobIds}
        onClose={onClose}
        onBackToRoutes={onBackToRoutes}
        onOpenLearnMore={onOpenLearnMore}
        onAddJob={onAddJob}
        onRemoveJob={onRemoveJob}
        onReviewStudioPlan={onReviewStudioPlan}
      />
    );
  }

  if (panel === "learnMore" && selectedRoadId && detailJobId) {
    const job = getJobsForRoad(selectedRoadId).find((j) => j.id === detailJobId);
    if (job) {
      return (
        <LearnMoreView
          job={job}
          roadId={selectedRoadId}
          inProject={selectedJobIds.has(job.id)}
          onClose={onClose}
          onBackToServices={onBackToServices}
          onAddJob={onAddJob}
          onRemoveJob={onRemoveJob}
          backLabel={learnMoreBackLabel}
        />
      );
    }
  }

  if (panel === "plan" && selectedRoadId) {
    const serviceIds = Array.from(selectedJobIds) as ServiceId[];
    const model = buildProjectBuilderStudioPlanSummary(
      serviceIds,
      selectedRoadId,
    );
    return (
      <ConversationStudioPlanPanel
        model={model}
        onClose={onClose}
        onViewScope={onOpenLearnMore}
      />
    );
  }

  if (panel === "checkout" && selectedRoadId) {
    return (
      <ConversationCheckoutPanel
        roadId={selectedRoadId}
        selectedJobIds={selectedJobIds}
        onClose={onClose}
        onBackToStudioPlan={onBackToStudioPlan}
        onPaymentComplete={onCheckoutPaymentComplete}
      />
    );
  }

  if (panel === "intake") {
    return (
      <ConversationIntakePanel
        onClose={onClose}
        onSubmitSuccess={onIntakeSubmitSuccess}
        onRecoverPayment={onRecoverIntakePayment}
        prefillBusinessName={intakePrefillBusinessName}
        onAnswersChange={onIntakeAnswersChange}
      />
    );
  }

  return null;
}
