"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import FeedbackStudioLayout from "@/components/feedback-studio/FeedbackStudioLayout";
import JobReviewWorkspace from "@/components/feedback-studio/JobReviewWorkspace";
import UnifiedRoomStateWorkspace from "@/components/feedback-studio/UnifiedRoomStateWorkspace";
import SharedFinalDeliveryGate from "@/components/studio-final-delivery-room/SharedFinalDeliveryGate";
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
import {
  resolveReviewRoomEntry,
  resolveUnifiedRoomJobId,
  reviewProofHref,
  singleCampaignJobId,
} from "@/lib/review-room-navigation";
import { useJobReview } from "@/lib/use-job-review";
import { useCurrentCampaign } from "@/lib/use-current-campaign";
import { useReviewDeliveryStages } from "@/lib/use-review-delivery-stages";

/** Feedback Studio — one Review Room: proof for a single ready job, chooser when mixed. */
export default function FeedbackStudioScene() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const campaignJobId = singleCampaignJobId(
    campaign?.postPayActivation?.jobIds,
  );
  const knownProofJobId = prefersUnifiedRoomState
    ? null
    : (jobIdParam ?? campaignJobId);

  const { state: stagesState } = useReviewDeliveryStages(
    prefersUnifiedRoomState || knownProofJobId ? undefined : effectiveCampaignId,
  );
  const entry =
    stagesState.status === "ready"
      ? resolveReviewRoomEntry(stagesState.jobs)
      : null;
  const proofJobId = knownProofJobId ?? (entry?.kind === "direct-proof" ? entry.jobId : null);
  const { review, loading: loadingJobReview, setReview, error: jobReviewError } = useJobReview(
    prefersUnifiedRoomState ? undefined : effectiveCampaignId,
    proofJobId,
  );

  const stagesLoading =
    Boolean(effectiveCampaignId) &&
    !prefersUnifiedRoomState &&
    !proofJobId &&
    (stagesState.status === "idle" || stagesState.status === "loading");
  const awaitingProof =
    Boolean(proofJobId) && !review && !jobReviewError;
  const jobReviewActive = Boolean(review);
  const pageState = useMemo(() => {
    if (prefersUnifiedRoomState) {
      if (!campaign && !effectiveCampaignId) return "no-campaign" as const;
      if (!campaign) return "no-campaign" as const;
      return "unified-room" as const;
    }
    if (jobReviewActive) return "job-review" as const;
    if (stagesLoading || loadingJobReview || awaitingProof) {
      return "loading-review" as const;
    }
    if (!campaign && !effectiveCampaignId) return "no-campaign" as const;
    if (!campaign && effectiveCampaignId && !jobReviewActive) return "not-ready" as const;
    if (!campaign) return "no-campaign" as const;
    return "not-ready" as const;
  }, [
    prefersUnifiedRoomState,
    campaign,
    effectiveCampaignId,
    jobReviewActive,
    stagesLoading,
    loadingJobReview,
    awaitingProof,
  ]);

  useEffect(() => {
    if (prefersUnifiedRoomState || jobIdParam) return;
    const jobId = campaignJobId ?? (entry?.kind === "direct-proof" ? entry.jobId : null);
    if (!jobId) return;
    router.replace(reviewProofHref(jobId));
  }, [prefersUnifiedRoomState, jobIdParam, campaignJobId, entry, router]);

  if (roomStateParam === "delivery") {
    if (ready && accessState !== "ready") {
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
    const earlyCampaignId = campaign?.campaignId ?? parsedJob?.campaignId ?? null;
    if (!earlyCampaignId) {
      return (
        <FeedbackStudioLayout>
          <div className="fs-page utility-page" aria-busy="true">
            <div className="utility-shell utility-shell--loading" />
          </div>
        </FeedbackStudioLayout>
      );
    }
    const unifiedJobId = jobIdParam ?? (campaign ? resolveUnifiedRoomJobId(campaign, jobIdParam) : null);
    const unifiedRoom = campaign ? (
      <FeedbackStudioLayout>
        <UnifiedRoomStateWorkspace
          roomState={roomStateParam}
          campaign={campaign}
          jobId={unifiedJobId}
        />
      </FeedbackStudioLayout>
    ) : (
      <FeedbackStudioLayout>
        <div className="fs-page utility-page" aria-busy="true">
          <div className="utility-shell utility-shell--loading" />
        </div>
      </FeedbackStudioLayout>
    );
    return (
      <SharedFinalDeliveryGate
        campaign={campaign}
        campaignId={earlyCampaignId}
        jobId={unifiedJobId}
        fallback={unifiedRoom}
      />
    );
  }

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

  // C8d — Final state of the same room. Delivery already returned above.
  if (campaign && prefersUnifiedRoomState) {
    const unifiedJobId = resolveUnifiedRoomJobId(campaign, jobIdParam);
    const unifiedRoom = (
      <FeedbackStudioLayout>
        <UnifiedRoomStateWorkspace
          roomState={roomStateParam}
          campaign={campaign}
          jobId={unifiedJobId}
        />
      </FeedbackStudioLayout>
    );
    return unifiedRoom;
  }

  if (pageState === "job-review" && review) {
    return (
      <FeedbackStudioLayout>
          <div className="fs-page utility-page fs-page--review" aria-label="Review workspace">
          <UtilityPageHeader
            backHref={studioBoard.routes.studioBoard}
            activeNav="review-room"
            title={feedbackStudio.pageTitle}
            backLabel={`← ${feedbackStudio.backLabel}`}
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
