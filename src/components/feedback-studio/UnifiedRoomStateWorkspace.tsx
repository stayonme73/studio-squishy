"use client";

import DeliverablesScene from "@/components/deliverables/DeliverablesScene";
import UnifiedRoomFinalSummary from "@/components/feedback-studio/UnifiedRoomFinalSummary";
import UnifiedRoomReviewToolsUnavailable from "@/components/feedback-studio/UnifiedRoomReviewToolsUnavailable";
import StudioBoardProjectCommunicationSection from "@/components/studio-board/StudioBoardProjectCommunicationSection";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import {
  C8D_ROOM_STATE_COPY,
  type UnifiedRoomStateId,
} from "@/config/c8d-unified-room-state-v1";
import { PROJECT_COMMUNICATION_CUSTOMER_V1 } from "@/config/project-communication-customer-v1";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { resolveFeedbackCampaignTitle } from "@/lib/feedback-studio-view";

type Props = {
  roomState: Extract<UnifiedRoomStateId, "final" | "delivery">;
  campaign: CampaignRecord;
  jobId?: string | null;
};

/** C8d — Final or Delivery state inside the unified Review Room shell. */
export default function UnifiedRoomStateWorkspace({ roomState, campaign, jobId }: Props) {
  const campaignTitle = resolveFeedbackCampaignTitle(campaign);
  const copy = roomState === "final" ? C8D_ROOM_STATE_COPY.final : C8D_ROOM_STATE_COPY.delivery;

  return (
    <div
      className="fs-page utility-page fs-page--review"
      aria-label={roomState === "final" ? "Final workspace" : "Delivery workspace"}
      data-room-state={roomState}
    >
      <UtilityPageHeader
        backHref={studioBoard.routes.studioBoard}
        activeNav="review-room"
        title="Review Room"
        lead={`${copy.pageLead} — ${campaignTitle}`}
      />

      <div className="fs-review fs-review--workspace">
        <div className="fs-review__layout">
          <div className="fs-review__main">
            {roomState === "final" ? (
              <UnifiedRoomFinalSummary campaignId={campaign.campaignId} jobId={jobId} />
            ) : (
              <DeliverablesScene embedded />
            )}
          </div>

          <aside
            className="fs-review__rail"
            aria-label="Review tools and project communication"
          >
            <UnifiedRoomReviewToolsUnavailable roomState={roomState} />
            <StudioBoardProjectCommunicationSection
              campaign={campaign}
              hasCampaign
              campaignLookupPending={false}
              jobId={jobId}
              presentation={{
                sectionTitle: PROJECT_COMMUNICATION_CUSTOMER_V1.reviewRoomSectionTitle,
                sectionLead: PROJECT_COMMUNICATION_CUSTOMER_V1.reviewRoomSectionLead,
                titleId: "fs-project-communication-title",
                rootClassName: "fs-project-communication bf-material bf-material-paper",
              }}
            />
          </aside>
        </div>
      </div>

      <StudioBoardDevStatus placement="sidebar" />
    </div>
  );
}
