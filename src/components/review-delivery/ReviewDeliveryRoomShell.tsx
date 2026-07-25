"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import ClientAccessStatePanel from "@/components/shared/ClientAccessStatePanel";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import type { CampaignRecord } from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import { resolveFeedbackCampaignTitle } from "@/lib/feedback-studio-view";
import type { ClientStagesJobItem } from "@/lib/review-delivery-stage/build-client-stages";
import { useReviewDeliveryStages } from "@/lib/use-review-delivery-stages";

type Props = {
  campaign: CampaignRecord;
  /** Opaque job id from the URL — never parsed for ownership. */
  requestedJobId: string | null;
};

const UNAVAILABLE_JOB_MESSAGE = "That work is not available.";
const UNSUBMITTED_DRAFT_NOTE =
  "You have saved feedback for this work, but it has not been submitted yet.";

function pickDefaultJobId(
  jobs: readonly ClientStagesJobItem[],
  requestedJobId: string | null,
): { jobId: string | null; requestedUnavailable: boolean } {
  if (jobs.length === 0) {
    return { jobId: null, requestedUnavailable: Boolean(requestedJobId) };
  }

  if (requestedJobId) {
    const match = jobs.find((job) => job.jobId === requestedJobId);
    if (match) {
      return { jobId: match.jobId, requestedUnavailable: false };
    }
    return { jobId: null, requestedUnavailable: true };
  }

  const active = jobs.filter((job) => job.stageId !== "cancelled");
  const pool = active.length > 0 ? active : jobs;

  const blocking = pool.find((job) => job.blocksCampaignCustomerAction);
  if (blocking) return { jobId: blocking.jobId, requestedUnavailable: false };

  const nonCancelled = pool.find((job) => job.stageId !== "cancelled");
  if (nonCancelled) return { jobId: nonCancelled.jobId, requestedUnavailable: false };

  return { jobId: pool[0]?.jobId ?? null, requestedUnavailable: false };
}

function reviewHref(jobId: string) {
  return `${studioBoard.routes.feedbackStudio}?jobId=${encodeURIComponent(jobId)}`;
}

function StageCard({ job }: { job: ClientStagesJobItem }) {
  const showReviewLink =
    job.stageId === "work-ready-for-review" ||
    job.stageId === "customer-reviewing" ||
    job.stageId === "revised-work-ready";
  const showDeliveryLink = job.stageId === "final-delivery";

  return (
    <section className="rd-stage-card" aria-labelledby="rd-stage-heading">
      <h2 id="rd-stage-heading" className="rd-stage-card__heading" tabIndex={-1}>
        {job.label}
      </h2>
      <p className="rd-stage-card__service">{job.serviceName}</p>
      <p className="rd-stage-card__explanation">{job.explanation}</p>
      {job.stageId === "customer-reviewing" ? (
        <p className="rd-stage-card__note">{UNSUBMITTED_DRAFT_NOTE}</p>
      ) : null}
      {showReviewLink ? (
        <p className="rd-stage-card__actions">
          <Link className="utility-btn utility-btn--primary" href={reviewHref(job.jobId)}>
            Open Review
          </Link>
        </p>
      ) : null}
      {showDeliveryLink ? (
        <p className="rd-stage-card__actions">
          <Link className="utility-btn utility-btn--primary" href={studioBoard.routes.deliverables}>
            Open Final Delivery
          </Link>
        </p>
      ) : null}
    </section>
  );
}

/** Package 7B1 — Review & Delivery Room shell (stage truth only; no tools). */
export default function ReviewDeliveryRoomShell({ campaign, requestedJobId }: Props) {
  const { state, refresh } = useReviewDeliveryStages(campaign.campaignId);
  const listHeadingId = useId();
  const campaignTitle = resolveFeedbackCampaignTitle(campaign);

  const defaultPick = useMemo(() => {
    if (state.status !== "ready") {
      return { jobId: null as string | null, requestedUnavailable: false };
    }
    return pickDefaultJobId(state.jobs, requestedJobId);
  }, [state, requestedJobId]);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showUnavailable, setShowUnavailable] = useState(false);

  useEffect(() => {
    if (state.status !== "ready") {
      setSelectedJobId(null);
      setShowUnavailable(false);
      return;
    }
    setSelectedJobId(defaultPick.jobId);
    setShowUnavailable(defaultPick.requestedUnavailable);
  }, [state.status, defaultPick.jobId, defaultPick.requestedUnavailable, requestedJobId, campaign.campaignId]);

  const selectedJob =
    state.status === "ready" && selectedJobId
      ? (state.jobs.find((job) => job.jobId === selectedJobId) ?? null)
      : null;

  useEffect(() => {
    if (state.status !== "ready") return;
    const heading = document.getElementById("rd-stage-heading");
    if (heading instanceof HTMLElement) {
      heading.focus();
    }
  }, [state.status, selectedJobId, showUnavailable]);

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="fs-page utility-page rd-shell" aria-busy="true">
        <div className="utility-shell utility-shell--loading" />
      </div>
    );
  }

  if (state.status === "auth-required") {
    return <ClientAccessStatePanel state="auth-required" />;
  }

  if (state.status === "denied") {
    return <ClientAccessStatePanel state="denied" />;
  }

  if (state.status === "not-found" || state.status === "error") {
    return (
      <ClientAccessStatePanel
        state="error"
        onRetry={state.status === "error" ? () => refresh() : undefined}
      />
    );
  }

  const { summary, jobs } = state;
  const activeJobs = jobs.filter((job) => job.stageId !== "cancelled");
  const canSelectCancelled = activeJobs.length === 0;

  return (
    <div className="fs-page utility-page rd-shell" aria-label="Review Room">
      <UtilityPageHeader
        backHref={studioBoard.routes.studioBoard}
        activeNav="review-room"
        title="Review Room"
        lead={campaignTitle}
      />

      <div className="rd-shell__body">
        <header className="rd-shell__summary">
          <p className="rd-shell__project">{campaignTitle}</p>
          <p className="rd-shell__summary-label">{summary.label}</p>
          <p className="rd-shell__summary-explanation">{summary.explanation}</p>
        </header>

        <div className="rd-shell__layout">
          <div className="rd-shell__jobs">
            <h2 className="rd-shell__jobs-heading" id={listHeadingId}>
              Project work
            </h2>
            {jobs.length === 0 ? (
              <p className="rd-shell__empty">There is no active work on this project yet.</p>
            ) : (
              <ul className="rd-job-list" aria-labelledby={listHeadingId}>
                {jobs.map((job) => {
                  const isCancelled = job.stageId === "cancelled";
                  const selectable = !isCancelled || canSelectCancelled;
                  const isSelected = !showUnavailable && selectedJobId === job.jobId;
                  return (
                    <li key={job.jobId}>
                      {selectable ? (
                        <button
                          type="button"
                          className={`rd-job-list__item${isSelected ? " rd-job-list__item--selected" : ""}`}
                          aria-current={isSelected ? "true" : undefined}
                          onClick={() => {
                            setShowUnavailable(false);
                            setSelectedJobId(job.jobId);
                          }}
                        >
                          <span className="rd-job-list__name">{job.serviceName}</span>
                          <span className="rd-job-list__stage">{job.label}</span>
                        </button>
                      ) : (
                        <div
                          className="rd-job-list__item rd-job-list__item--inactive"
                          aria-disabled="true"
                        >
                          <span className="rd-job-list__name">{job.serviceName}</span>
                          <span className="rd-job-list__stage">{job.label}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rd-shell__content" aria-live="polite">
            {showUnavailable ? (
              <section className="rd-stage-card" aria-labelledby="rd-stage-heading">
                <h2 id="rd-stage-heading" className="rd-stage-card__heading" tabIndex={-1}>
                  {UNAVAILABLE_JOB_MESSAGE}
                </h2>
                <p className="rd-stage-card__explanation">
                  Choose a project from the list, or return to the Studio Board.
                </p>
              </section>
            ) : selectedJob ? (
              <StageCard job={selectedJob} />
            ) : (
              <section className="rd-stage-card" aria-labelledby="rd-stage-heading">
                <h2 id="rd-stage-heading" className="rd-stage-card__heading" tabIndex={-1}>
                  {summary.label}
                </h2>
                <p className="rd-stage-card__explanation">{summary.explanation}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
