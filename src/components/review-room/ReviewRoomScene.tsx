"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import CampaignJourneyMap from "@/components/studio-board/CampaignJourneyMap";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import { reviewRoom } from "@/config/review-room";
import { studioBoard } from "@/config/studio-board";
import { selectCampaignOption } from "@/lib/studio-board-campaign";
import { useCurrentCampaign } from "@/lib/use-current-campaign";

/** Review Room — choose A / B / C (Phase 1). */
export default function ReviewRoomScene() {
  const router = useRouter();
  const { campaign, ready } = useCurrentCampaign();

  const selectedOption = campaign?.selectedCampaignOption ?? null;
  const isReviewReady = campaign?.campaignStatus === "READY_FOR_REVIEW";

  const pageState = useMemo(() => {
    if (!campaign) return "no-campaign" as const;
    if (!isReviewReady) return "not-ready" as const;
    return "ready" as const;
  }, [campaign, isReviewReady]);

  function handleSelect(optionTitle: string) {
    selectCampaignOption(optionTitle);
    router.push(studioBoard.routes.studioBoard);
  }

  if (!ready) {
    return (
      <UtilityPageFrame navId="review-room">
        <div className="utility-page" aria-busy="true">
          <div className="utility-shell utility-shell--loading" />
        </div>
      </UtilityPageFrame>
    );
  }

  if (pageState === "no-campaign") {
    return (
      <UtilityPageFrame navId="review-room">
        <div className="utility-page">
          <UtilityPageHeader
            backHref={studioBoard.routes.studioBoard}
            activeNav="review-room"
            title={reviewRoom.noCampaign.title}
            lead={reviewRoom.noCampaign.body}
          />
          <div className="utility-shell">
            <Link href={studioBoard.routes.studioBoard} className="utility-btn utility-btn--primary">
              {reviewRoom.noCampaign.cta} →
            </Link>
          </div>
          <StudioBoardDevStatus placement="sidebar" />
        </div>
      </UtilityPageFrame>
    );
  }

  if (pageState === "not-ready") {
    return (
      <UtilityPageFrame navId="review-room">
        <div className="utility-page">
          <UtilityPageHeader
            backHref={studioBoard.routes.studioBoard}
            activeNav="review-room"
            title={reviewRoom.notReady.title}
            lead={reviewRoom.notReady.body}
          />
          <div className="utility-shell">
            <Link href={studioBoard.routes.studioBoard} className="utility-btn utility-btn--primary">
              {reviewRoom.backLabel} →
            </Link>
          </div>
          <StudioBoardDevStatus placement="sidebar" />
        </div>
      </UtilityPageFrame>
    );
  }

  return (
    <UtilityPageFrame navId="review-room">
      <div className="utility-page" aria-label="Review Room">
        <UtilityPageHeader
          backHref={studioBoard.routes.studioBoard}
          activeNav="review-room"
          title={reviewRoom.pageTitle}
          lead={reviewRoom.intro}
          aside={
            <CampaignJourneyMap
              activeStep="review-room"
              status={campaign?.campaignStatus ?? null}
              hasCampaign
            />
          }
        />

        <div className="utility-grid rr-options">
          {reviewRoom.options.map((option) => {
            const isSelected = selectedOption === option.title;
            return (
              <article key={option.id} className="utility-card rr-card">
                <div className="rr-card__badge">{option.id}</div>
                <h2 className="rr-card__title">{option.title}</h2>
                <p className="rr-card__tagline">{option.tagline}</p>
                <p className="rr-card__body">{option.description}</p>
                {isSelected ? (
                  <p className="rr-card__selected">{reviewRoom.selectedBadge}</p>
                ) : (
                  <button
                    type="button"
                    className="utility-btn utility-btn--primary rr-card__cta"
                    onClick={() => handleSelect(option.title)}
                  >
                    {reviewRoom.selectCta}
                  </button>
                )}
              </article>
            );
          })}
        </div>

        <StudioBoardDevStatus placement="sidebar" />
      </div>
    </UtilityPageFrame>
  );
}
