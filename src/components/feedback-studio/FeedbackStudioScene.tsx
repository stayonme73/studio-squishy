"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import FeedbackStudioLayout from "@/components/feedback-studio/FeedbackStudioLayout";
import JobReviewWorkspace from "@/components/feedback-studio/JobReviewWorkspace";
import UnifiedRoomStateWorkspace from "@/components/feedback-studio/UnifiedRoomStateWorkspace";
import ReviewDeliveryRoomShell from "@/components/review-delivery/ReviewDeliveryRoomShell";
import ClientAccessStatePanel from "@/components/shared/ClientAccessStatePanel";
import NoActiveProjectPanel from "@/components/shared/NoActiveProjectPanel";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import { c8dUnifiedRoomStateV1 } from "@/config/c8d-unified-room-state-v1";
import { feedbackStudio } from "@/config/feedback-studio";
import { studioBoard } from "@/config/studio-board";
import { parseUnifiedRoomStateParam } from "@/lib/c8d-unified-room-state";
import { parseJobId } from "@/lib/job-control/lane-map";
import { useDiscoverJobReview, useJobReview } from "@/lib/use-job-review";
import { useCurrentCampaign } from "@/lib/use-current-campaign";

/** Feedback Studio — job-scoped Review Room shell + Final / Delivery room states. */
export default function FeedbackStudioScene() {
  const searchParams = useSearchParams();
  const { campaign, ready, accessState, refresh } = useCurrentCampaign();

  const jobIdParam = searchParams.get("jobId");
  const roomStateParam = parseUnifiedRoomStateParam(
    searchParams.get(c8dUnifiedRoomStateV1.queryKey),
  );
  /** Final / Delivery are explicit room states — do not let Job Review steal the URL. */
  const prefersUnifiedRoomState =
    roomStateParam === "final" || roomStateParam === "delivery";
  const parsedJob = jobIdParam ? parseJobId(jobIdParam) : null;
  const effectiveCampaignId = campaign?.campaignId ?? parsedJob?.campaignId;

  const { primaryReview, loading: discoveringJobs } = useDiscoverJobReview(
    prefersUnifiedRoomState ? undefined : effectiveCampaignId,
  );
  const activeJobId = prefersUnifiedRoomState
    ? null
    : (jobIdParam ?? primaryReview?.jobId ?? null);
  const { review, loading: loadingJobReview, setReview } = useJobReview(
    prefersUnifiedRoomState ? undefined : effectiveCampaignId,
    activeJobId,
  );

  const jobReviewActive = Boolean(review);
  const pageState = useMemo(() => {
    if (prefersUnifiedRoomState) {
      if (!campaign && !effectiveCampaignId) return "no-campaign" as const;
      if (!campaign) return "no-campaign" as const;
      return "unified-room" as const;
    }
    if (jobReviewActive) return "job-review" as const;
    if (discoveringJobs || loadingJobReview) return "loading-review" as const;
    if (!campaign && !effectiveCampaignId) return "no-campaign" as const;
    if (!campaign && effectiveCampaignId && !jobReviewActive) return "not-ready" as const;
    if (!campaign) return "no-campaign" as const;
    return "not-ready" as const;
  }, [
    prefersUnifiedRoomState,
    campaign,
    effectiveCampaignId,
    jobReviewActive,
    discoveringJobs,
    loadingJobReview,
  ]);

  if (!ready || pageState === "loading-review") {
    return (
      <FeedbackStudioLayout>
        <div className="fs-page utility-page" aria-busy="true">
          <div className="utility-shell utility-shell--loading" />
        </div>
      </FeedbackStudioLayout>
    );
  }

  if (accessState !== "ready") {
    return (
      <FeedbackStudioLayout>
        {accessState === "no-active-project" ? (
          <NoActiveProjectPanel copy={feedbackStudio.clientAccess.noActiveProject} />
        ) : (
          <ClientAccessStatePanel
            state={accessState}
            onRetry={accessState === "error" ? () => void refresh() : undefined}
          />
        )}
      </FeedbackStudioLayout>
    );
  }

  if (pageState === "no-campaign") {
    return (
      <FeedbackStudioLayout>
        <NoActiveProjectPanel copy={feedbackStudio.clientAccess.noActiveProject} titleId="fs-access-title" />
      </FeedbackStudioLayout>
    );
  }

  // C8d — Final / Delivery states of the same unified room (not a second product).
  if (campaign && prefersUnifiedRoomState) {
    return (
      <FeedbackStudioLayout>
        <UnifiedRoomStateWorkspace
          roomState={roomStateParam}
          campaign={campaign}
          jobId={jobIdParam}
        />
      </FeedbackStudioLayout>
    );
  }

  // Explicit authorized review deep link only — bare /feedback-studio uses the shell.
  if (jobIdParam && pageState === "job-review" && review) {
    return (
      <FeedbackStudioLayout>
        <div className="fs-page utility-page fs-page--review" aria-label="Job review workspace">
          <UtilityPageHeader
            backHref={studioBoard.routes.studioBoard}
            activeNav="review-room"
            title={feedbackStudio.pageTitle}
            lead={`${feedbackStudio.pageSubtitle} — ${review.serviceName}`}
          />

          <JobReviewWorkspace
            review={review}
            campaign={campaign}
            onReviewUpdated={setReview}
          />

          <StudioBoardDevStatus placement="sidebar" />
        </div>
      </FeedbackStudioLayout>
    );
  }

  if (campaign) {
    return (
      <FeedbackStudioLayout>
        <ReviewDeliveryRoomShell campaign={campaign} requestedJobId={jobIdParam} />
      </FeedbackStudioLayout>
    );
  }

  return (
    <FeedbackStudioLayout>
      <NoActiveProjectPanel copy={feedbackStudio.clientAccess.noActiveProject} titleId="fs-access-title" />
    </FeedbackStudioLayout>
  );
}
