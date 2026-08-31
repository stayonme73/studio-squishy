"use client";

import { useState } from "react";

import ProjectBuilderJobDetailBlocks from "@/components/project-builder/ProjectBuilderJobDetailBlocks";
import "@/components/project-builder/project-builder-job-details.css";
import SamsungDenimCta from "@/components/studio-conversation-room/guide/SamsungDenimCta";
import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
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
import { resolveProjectBuilderJobPresentation } from "@/lib/project-builder-update-exit-copy";

function formatEstimate(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function jobsSortedByPrice(jobs: readonly RouteMapJob[]): RouteMapJob[] {
  return [...jobs].sort((a, b) => a.priceCents - b.priceCents);
}

export type ConversationServiceListProps = {
  roadId: RouteMapRoadId;
  selectedJobIds: ReadonlySet<RouteMapJobId>;
  onClose: () => void;
  onBackToRoutes: () => void;
  onAddJob: (jobId: RouteMapJobId) => void;
  onRemoveJob: (jobId: RouteMapJobId) => void;
  onReviewStudioPlan: () => void;
  /** Mobile dedicated page — not an overlay on Conversation Room. */
  phonePage?: boolean;
};

export default function ConversationServiceList({
  roadId,
  selectedJobIds,
  onClose,
  onBackToRoutes,
  onAddJob,
  onRemoveJob,
  onReviewStudioPlan,
  phonePage = false,
}: ConversationServiceListProps) {
  const v = conversationRoomGuideV1;
  const road = getRouteMapRoad(roadId);
  const jobs = jobsSortedByPrice(getJobsForRoad(roadId));
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
    <div
      className={styles.sheet}
      data-panel="builder"
      data-surface={phonePage ? "page" : "overlay"}
    >
      <header className={styles.header} data-builder-chrome="header">
        <div>
          {phonePage ? (
            <p className={styles.eyebrow}>{v.servicesStepLabel}</p>
          ) : (
            <p className={styles.eyebrow}>
              {road
                ? `${road.highwayLabel} — ${road.customerLabel}`
                : "Your route"}
            </p>
          )}
          <h2 className={styles.title}>{v.servicesPanelTitle}</h2>
          <p
            className={styles.builderRouteContext}
            data-builder-route-context="true"
          >
            {road ? road.customerLabel : "Your route"}
          </p>
        </div>
        {phonePage ? null : (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close activity panel"
          >
            Close
          </button>
        )}
      </header>

      {phonePage ? null : <p className={styles.intro}>{v.servicesPanelLead}</p>}

      <div className={styles.builderToolbar} data-builder-chrome="toolbar">
        <button type="button" className={styles.backLink} onClick={onBackToRoutes}>
          ← {phonePage ? v.servicesBackToRouteLabel : v.servicesBackToRoutesLabel}
        </button>
        <div className={styles.builderSummaryStack}>
          <p className={styles.builderCount}>
            {PROJECT_BUILDER_V1.selectedCountLabel}: {selectedCount}
          </p>
          <p
            className={styles.builderSummary}
            aria-live="polite"
            aria-label={`${PROJECT_BUILDER_V1.totalLabel} ${formatEstimate(estimateCents)}. ${selectedCount} ${PROJECT_BUILDER_V1.selectedCountLabel.toLowerCase()} selected.`}
          >
            {PROJECT_BUILDER_V1.totalLabel}: {formatEstimate(estimateCents)}
          </p>
        </div>
      </div>

      <div className={styles.jobList} data-service-list="true">
        {jobs.map((job) => {
          const inProject = selectedJobIds.has(job.id);
          const expanded = expandedIds.has(job.id);
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
              <p className={styles.jobBestFor}>
                <span className={styles.jobBestForLabel}>
                  {PROJECT_BUILDER_V1.bestForLabel}
                </span>{" "}
                {tagline}
              </p>

              <button
                type="button"
                className={styles.expandToggle}
                aria-expanded={expanded}
                onClick={() => toggleExpanded(job.id)}
              >
                {expanded
                  ? `${v.servicesHideFullDetails} ▲`
                  : `${v.servicesShowFullDetails} ▼`}
              </button>

              {expanded ? (
                <div className={`${styles.jobExpand} pb-job-details-surface`}>
                  <ProjectBuilderJobDetailBlocks job={job} roadId={roadId} />
                </div>
              ) : null}

              <div className={styles.jobActions}>
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
          <SamsungDenimCta
            onActivate={onReviewStudioPlan}
            dataAttr="review-plan"
          >
            {v.servicesReviewPlanCta}
          </SamsungDenimCta>
        </div>
      ) : null}
    </div>
  );
}
