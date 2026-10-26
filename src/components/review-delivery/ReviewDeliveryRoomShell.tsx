"use client";

import Link from "next/link";
import { useEffect, useId, useMemo } from "react";

import ClientAccessStatePanel from "@/components/shared/ClientAccessStatePanel";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import type { CampaignRecord } from "@/config/studio-board";
import { feedbackStudio } from "@/config/feedback-studio";
import { studioBoard } from "@/config/studio-board";
import { studioReviewRoomNavigationSimplificationV1 as navCopy } from "@/config/studio-review-room-navigation-simplification-v1";
import { buildUnifiedRoomHref } from "@/lib/c8d-unified-room-state";
import { resolveFeedbackCampaignTitle } from "@/lib/feedback-studio-view";
import type { ClientStagesJobItem } from "@/lib/review-delivery-stage/build-client-stages";
import {
  partitionReviewRoomJobs,
  pickDefaultJobId,
  reviewProofHref,
} from "@/lib/review-room-navigation";
import { useReviewDeliveryStages } from "@/lib/use-review-delivery-stages";

type Props = {
  campaign: CampaignRecord;
  /** Opaque job id from the URL — never parsed for ownership. */
  requestedJobId: string | null;
};

const UNAVAILABLE_JOB_MESSAGE = "That work is not available.";
const UNSUBMITTED_DRAFT_NOTE =
  "You have saved feedback for this work, but it has not been submitted yet.";

function completedHref(job: ClientStagesJobItem): string | null {
  if (job.stageId === "approved-for-final-delivery") {
    return buildUnifiedRoomHref({ roomState: "final", jobId: job.jobId });
  }
  if (job.stageId === "final-delivery") {
    return studioBoard.routes.deliverables;
  }
  return null;
}

function completedLinkLabel(job: ClientStagesJobItem): string | null {
  if (job.stageId === "approved-for-final-delivery") return "Open Final";
  if (job.stageId === "final-delivery") return "Open Final Delivery";
  return null;
}

/** In-room chooser for mixed or not-yet-ready work. Not a second Review Room. */
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

  useEffect(() => {
    if (state.status !== "ready") return;
    const heading = document.getElementById("rd-stage-heading");
    if (heading instanceof HTMLElement) {
      heading.focus();
    }
  }, [state.status, defaultPick.jobId, defaultPick.requestedUnavailable, requestedJobId, campaign.campaignId]);

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

  const { jobs } = state;
  const { ready, stillWorking, other } = partitionReviewRoomJobs(jobs);
  const showUnavailable = Boolean(requestedJobId) && defaultPick.requestedUnavailable;

  return (
    <div className="fs-page utility-page fs-page--review rd-shell" aria-label="Review Room">
      <UtilityPageHeader
        backHref={studioBoard.routes.studioBoard}
        activeNav="review-room"
        title="Review Room"
        backLabel={`← ${studioBoard.campaignDetails.backLabel}`}
      />

      <div className="rd-shell__body">
        <div className="rd-shell__layout rd-shell__layout--room">
          <div className="rd-shell__side">
            <header className="rd-shell__summary">
              <p className="rd-shell__project">{campaignTitle}</p>
            </header>
            <div className="rd-shell__jobs">
            {showUnavailable ? (
              <section className="rd-stage-card" aria-labelledby="rd-stage-heading">
                <h2 id="rd-stage-heading" className="rd-stage-card__heading" tabIndex={-1}>
                  {UNAVAILABLE_JOB_MESSAGE}
                </h2>
                <p className="rd-stage-card__explanation">
                  Choose a project from the list, or return to the Studio Board.
                </p>
              </section>
            ) : null}

            {jobs.length === 0 ? (
              <p className="rd-shell__empty">There is no active work on this project yet.</p>
            ) : (
              <>
                {ready.length > 0 ? (
                  <section className="rd-shell__group" aria-labelledby={`${listHeadingId}-ready`}>
                    <h2
                      className="rd-shell__jobs-heading"
                      id={showUnavailable ? `${listHeadingId}-ready` : "rd-stage-heading"}
                      tabIndex={-1}
                    >
                      {navCopy.copy.readyHeading}
                    </h2>
                    <ul className="rd-job-list">
                      {ready.map((job) => (
                        <li key={job.jobId}>
                          <Link
                            className="rd-job-list__item"
                            href={reviewProofHref(job.jobId)}
                          >
                            <span className="rd-job-list__name">{job.serviceName}</span>
                            <span className="rd-job-list__stage">{job.label}</span>
                            {job.stageId === "customer-reviewing" ? (
                              <span className="rd-job-list__note">{UNSUBMITTED_DRAFT_NOTE}</span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {stillWorking.length > 0 ? (
                  <section className="rd-shell__group" aria-labelledby={`${listHeadingId}-working`}>
                    <h2
                      className="rd-shell__jobs-heading"
                      id={
                        showUnavailable || ready.length > 0
                          ? `${listHeadingId}-working`
                          : "rd-stage-heading"
                      }
                      tabIndex={-1}
                    >
                      {navCopy.copy.stillWorkingHeading}
                    </h2>
                    <ul className="rd-job-list">
                      {stillWorking.map((job) => (
                        <li key={job.jobId}>
                          <div
                            className="rd-job-list__item rd-job-list__item--inactive"
                            aria-disabled="true"
                          >
                            <span className="rd-job-list__name">{job.serviceName}</span>
                            <span className="rd-job-list__stage">{job.label}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {other.length > 0 ? (
                  <ul className="rd-job-list rd-job-list--other">
                    {other.map((job) => {
                      const href = completedHref(job);
                      const label = completedLinkLabel(job);
                      return (
                        <li key={job.jobId}>
                          {href && label ? (
                            <p className="rd-stage-card__actions">
                              <span className="rd-job-list__name">{job.serviceName}</span>
                              <Link className="utility-btn utility-btn--primary" href={href}>
                                {label}
                              </Link>
                            </p>
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
                ) : null}
              </>
            )}
            </div>
          </div>
          <div className="rd-shell__desk rd-shell__desk--empty">
            <div className="rd-shell__tools" role="toolbar" aria-label="Review tools">
              <button type="button" className="rd-shell__tool is-muted" disabled tabIndex={-1}>
                {feedbackStudio.feedbackPanel.laptopWorkDesk.marker}
              </button>
              <button type="button" className="rd-shell__tool is-muted" disabled tabIndex={-1}>
                {feedbackStudio.feedbackPanel.laptopWorkDesk.highlighter}
              </button>
              <button type="button" className="rd-shell__tool is-muted" disabled tabIndex={-1}>
                {feedbackStudio.feedbackPanel.laptopWorkDesk.voice}
              </button>
              <button type="button" className="rd-shell__tool is-muted" disabled tabIndex={-1}>
                {feedbackStudio.feedbackPanel.laptopWorkDesk.message}
              </button>
            </div>
            <h2 id="rd-work-area-heading" className="rd-shell__jobs-heading">
              {feedbackStudio.feedbackPanel.laptopWorkDesk.workArea}
            </h2>
            <section className="rd-shell__stage" aria-labelledby="rd-work-area-heading">
              <p className="rd-shell__stage-copy">
                {ready.length > 0
                  ? "Open the work that is ready. It will appear in this space."
                  : feedbackStudio.notReady.body}
              </p>
            </section>
            <button type="button" className="rd-shell__submit is-muted" disabled tabIndex={-1}>
              {feedbackStudio.feedbackPanel.laptopWorkDesk.submit}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
