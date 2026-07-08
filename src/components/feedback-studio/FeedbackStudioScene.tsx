"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import FeedbackStudioConceptPicker, {
  conceptOptionTitle,
} from "@/components/feedback-studio/FeedbackStudioConceptPicker";
import FeedbackStudioConceptReview from "@/components/feedback-studio/FeedbackStudioConceptReview";
import FeedbackStudioLayout from "@/components/feedback-studio/FeedbackStudioLayout";
import FeedbackStudioRevisionStatus from "@/components/feedback-studio/FeedbackStudioRevisionStatus";
import JobReviewWorkspace from "@/components/feedback-studio/JobReviewWorkspace";
import ClientAccessStatePanel from "@/components/shared/ClientAccessStatePanel";
import NoActiveProjectPanel from "@/components/shared/NoActiveProjectPanel";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import CampaignJourneyMap from "@/components/studio-board/CampaignJourneyMap";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import {
  feedbackStudio,
  getFeedbackConcept,
  isFeedbackConceptId,
} from "@/config/feedback-studio";
import { studioBoard } from "@/config/studio-board";
import { resolveCampaignConcepts } from "@/lib/campaign-concepts";
import { resolveDeliverableScopeFromCampaign } from "@/lib/deliverable-scope";
import {
  resolveFeedbackCampaignTitle,
  resolveFeedbackRevisionStatus,
} from "@/lib/feedback-studio-view";
import { selectCampaignOption } from "@/lib/studio-board-campaign";
import { parseJobId } from "@/lib/job-control/lane-map";
import { useDiscoverJobReview, useJobReview } from "@/lib/use-job-review";
import { useCurrentCampaign } from "@/lib/use-current-campaign";

/** Feedback Studio — job-scoped Review Room (V1) + legacy concept review. */
export default function FeedbackStudioScene() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { campaign, ready, accessState, refresh } = useCurrentCampaign();

  const conceptParam = searchParams.get("concept");
  const jobIdParam = searchParams.get("jobId");
  const parsedJob = jobIdParam ? parseJobId(jobIdParam) : null;
  const effectiveCampaignId = campaign?.campaignId ?? parsedJob?.campaignId;

  const { primaryReview, loading: discoveringJobs } = useDiscoverJobReview(effectiveCampaignId);
  const activeJobId = jobIdParam ?? primaryReview?.jobId ?? null;
  const { review, loading: loadingJobReview, setReview } = useJobReview(
    effectiveCampaignId,
    activeJobId,
  );

  const concepts = useMemo(() => resolveCampaignConcepts(campaign), [campaign]);
  const scopeSections = useMemo(
    () => (campaign ? resolveDeliverableScopeFromCampaign(campaign) : []),
    [campaign],
  );
  const activeConcept =
    isFeedbackConceptId(conceptParam) && concepts.length > 0
      ? getFeedbackConcept(conceptParam, concepts)
      : null;

  const selectedOption = campaign?.selectedCampaignOption ?? null;
  const isConceptReviewReady =
    campaign?.campaignStatus === "READY_FOR_REVIEW" && concepts.length > 0;
  const campaignTitle = resolveFeedbackCampaignTitle(campaign);
  const revisionStatus = resolveFeedbackRevisionStatus(campaign);

  const jobReviewActive = Boolean(review);
  const pageState = useMemo(() => {
    if (jobReviewActive) return "job-review" as const;
    if (discoveringJobs || loadingJobReview) return "loading-review" as const;
    if (!campaign && !effectiveCampaignId) return "no-campaign" as const;
    if (!campaign && effectiveCampaignId && !jobReviewActive) return "not-ready" as const;
    if (!campaign) return "no-campaign" as const;
    if (isConceptReviewReady) return "concept-ready" as const;
    return "not-ready" as const;
  }, [
    campaign,
    effectiveCampaignId,
    jobReviewActive,
    discoveringJobs,
    loadingJobReview,
    isConceptReviewReady,
  ]);

  const conceptHref = useCallback((id: string) => {
    return `${studioBoard.routes.feedbackStudio}?concept=${id}`;
  }, []);

  const pickerHref = studioBoard.routes.feedbackStudio;

  function handleSelect(optionTitle: string) {
    selectCampaignOption(optionTitle);
    router.push(studioBoard.routes.deliverables);
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

  if (pageState === "not-ready") {
    return (
      <FeedbackStudioLayout>
        <NoActiveProjectPanel copy={feedbackStudio.clientAccess.notReady} titleId="fs-not-ready-title" />
      </FeedbackStudioLayout>
    );
  }

  if (pageState === "job-review" && review) {
    return (
      <FeedbackStudioLayout>
        <div className="fs-page utility-page fs-page--review" aria-label="Job review workspace">
          <UtilityPageHeader
            backHref={studioBoard.routes.studioBoard}
            activeNav="review-room"
            title={feedbackStudio.pageTitle}
            lead={`${feedbackStudio.pageSubtitle} — ${review.serviceName}`}
          />

          <JobReviewWorkspace review={review} onReviewUpdated={setReview} />

          <StudioBoardDevStatus placement="sidebar" />
        </div>
      </FeedbackStudioLayout>
    );
  }

  if (activeConcept && campaign) {
    return (
      <FeedbackStudioLayout>
        <div className="fs-page utility-page fs-page--review" aria-label={`Concept ${activeConcept.id} review`}>
          <UtilityPageHeader
            backHref={pickerHref}
            activeNav="review-room"
            title={feedbackStudio.pageTitle}
            lead={`${feedbackStudio.pageSubtitle} — Reviewing ${activeConcept.directionLabel} · ${activeConcept.tagline}`}
          />

          <FeedbackStudioConceptReview
            concept={activeConcept}
            campaign={campaign}
            campaignTitle={campaignTitle}
            campaignId={campaign.campaignId}
            pickerHref={pickerHref}
            revisionStatus={revisionStatus}
            selectedOptionTitle={selectedOption}
            onSelect={() => handleSelect(conceptOptionTitle(activeConcept))}
          />

          <StudioBoardDevStatus placement="sidebar" />
        </div>
      </FeedbackStudioLayout>
    );
  }

  return (
    <FeedbackStudioLayout>
      <div className="fs-page utility-page" aria-label={feedbackStudio.pageTitle}>
        <UtilityPageHeader
          backHref={studioBoard.routes.studioBoard}
          activeNav="review-room"
          title={feedbackStudio.pageTitle}
          lead={`${feedbackStudio.pageSubtitle} — ${feedbackStudio.pickerTitle}`}
          aside={
            <CampaignJourneyMap
              activeStep="review-room"
              status={campaign?.campaignStatus ?? null}
              hasCampaign
            />
          }
        />

        <div className="fs-page__meta">
          <FeedbackStudioRevisionStatus status={revisionStatus} />
        </div>

        <FeedbackStudioConceptPicker
          concepts={concepts}
          campaignTitle={campaignTitle}
          selectedOptionTitle={selectedOption}
          conceptHref={conceptHref}
          scopeSections={scopeSections}
        />

        <StudioBoardDevStatus placement="sidebar" />
      </div>
    </FeedbackStudioLayout>
  );
}
