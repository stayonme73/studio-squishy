"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import FeedbackStudioConceptPicker, {
  conceptOptionTitle,
} from "@/components/feedback-studio/FeedbackStudioConceptPicker";
import FeedbackStudioConceptReview from "@/components/feedback-studio/FeedbackStudioConceptReview";
import FeedbackStudioLayout from "@/components/feedback-studio/FeedbackStudioLayout";
import FeedbackStudioRevisionStatus from "@/components/feedback-studio/FeedbackStudioRevisionStatus";
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
import {
  resolveFeedbackCampaignTitle,
  resolveFeedbackRevisionStatus,
} from "@/lib/feedback-studio-view";
import { selectCampaignOption } from "@/lib/studio-board-campaign";
import { useCurrentCampaign } from "@/lib/use-current-campaign";

/** Feedback Studio — concept preview & review workspace. */
export default function FeedbackStudioScene() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { campaign, ready } = useCurrentCampaign();

  const conceptParam = searchParams.get("concept");
  const concepts = useMemo(() => resolveCampaignConcepts(campaign), [campaign]);
  const activeConcept =
    isFeedbackConceptId(conceptParam) && concepts.length > 0
      ? getFeedbackConcept(conceptParam, concepts)
      : null;

  const selectedOption = campaign?.selectedCampaignOption ?? null;
  const isReviewReady =
    campaign?.campaignStatus === "READY_FOR_REVIEW" && concepts.length > 0;
  const campaignTitle = resolveFeedbackCampaignTitle(campaign);
  const revisionStatus = resolveFeedbackRevisionStatus(campaign);

  const pageState = useMemo(() => {
    if (!campaign) return "no-campaign" as const;
    if (!isReviewReady) return "not-ready" as const;
    return "ready" as const;
  }, [campaign, isReviewReady]);

  const conceptHref = useCallback((id: string) => {
    return `${studioBoard.routes.feedbackStudio}?concept=${id}`;
  }, []);

  const pickerHref = studioBoard.routes.feedbackStudio;

  function handleSelect(optionTitle: string) {
    selectCampaignOption(optionTitle);
    router.push(studioBoard.routes.studioBoard);
  }

  if (!ready) {
    return (
      <FeedbackStudioLayout>
        <div className="fs-page utility-page" aria-busy="true">
          <div className="utility-shell utility-shell--loading" />
        </div>
      </FeedbackStudioLayout>
    );
  }

  if (pageState === "no-campaign") {
    return (
      <FeedbackStudioLayout>
        <div className="fs-page utility-page">
          <UtilityPageHeader
            backHref={studioBoard.routes.studioBoard}
            activeNav="review-room"
            title={feedbackStudio.noCampaign.title}
            lead={feedbackStudio.noCampaign.body}
          />
          <div className="utility-shell">
            <Link href={studioBoard.routes.studioBoard} className="utility-btn utility-btn--primary">
              {feedbackStudio.noCampaign.cta} →
            </Link>
          </div>
          <StudioBoardDevStatus placement="sidebar" />
        </div>
      </FeedbackStudioLayout>
    );
  }

  if (pageState === "not-ready") {
    return (
      <FeedbackStudioLayout>
        <div className="fs-page utility-page">
          <UtilityPageHeader
            backHref={studioBoard.routes.studioBoard}
            activeNav="review-room"
            title={feedbackStudio.notReady.title}
            lead={feedbackStudio.notReady.body}
          />
          <div className="utility-shell">
            <Link href={studioBoard.routes.studioBoard} className="utility-btn utility-btn--primary">
              {feedbackStudio.backLabel} →
            </Link>
          </div>
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
            lead={`Reviewing ${activeConcept.directionLabel} — ${activeConcept.tagline}`}
          />

          <FeedbackStudioConceptReview
            concept={activeConcept}
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
          lead={feedbackStudio.pickerTitle}
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
        />

        <StudioBoardDevStatus placement="sidebar" />
      </div>
    </FeedbackStudioLayout>
  );
}
