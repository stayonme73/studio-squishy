"use client";

import Link from "next/link";

import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { hasCampaignCreativeBrief } from "@/lib/campaign-brief-source";
import { draftRoomEditHref, isIntakeEditableForCustomer } from "@/lib/intake-edit";

const { campaignBrief, routes } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
  /** Opens the Campaign Record drawer when provided; otherwise links to Studio Board. */
  onViewBrief?: () => void;
  /** Hide the view action when the customer is already on the brief surface. */
  showView?: boolean;
  className?: string;
  layout?: "row" | "stack";
  /**
   * Legacy primary styling. Studio Board Package B keeps the submitted-details
   * control secondary so Next Action remains the unmistakable Board primary.
   */
  prominent?: boolean;
  /** Live customer status overlay — locks pre-production hint after production starts. */
  currentStatusLabel?: string | null;
};

/** View / edit campaign brief — intake editable until concepting begins. */
export default function CampaignBriefActions({
  campaign,
  onViewBrief,
  showView = true,
  className = "",
  layout = "row",
  prominent = false,
  currentStatusLabel = null,
}: Props) {
  if (!campaign || !hasCampaignCreativeBrief(campaign)) return null;

  const editable = isIntakeEditableForCustomer(campaign.campaignStatus, currentStatusLabel);
  const editHref = draftRoomEditHref(campaign.packageId, campaign);
  const viewButtonClass = prominent
    ? "utility-btn utility-btn--primary campaign-brief-actions__view"
    : "utility-btn utility-btn--secondary campaign-brief-actions__view";
  const rootClass = [
    "campaign-brief-actions",
    layout === "stack" ? "campaign-brief-actions--stack" : "",
    prominent ? "campaign-brief-actions--prominent" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      {showView ? (
        onViewBrief ? (
          <button type="button" className={viewButtonClass} onClick={onViewBrief}>
            {campaignBrief.openRecordLabel}
          </button>
        ) : (
          <Link href={routes.campaignDetails} className={viewButtonClass}>
            {campaignBrief.openRecordLabel}
          </Link>
        )
      ) : null}

      {editable ? (
        <Link href={editHref} className="utility-btn utility-btn--secondary">
          {campaignBrief.editLabel}
        </Link>
      ) : (
        <p className="campaign-brief-actions__locked" role="status">
          {campaignBrief.lockedMessage}
        </p>
      )}

      {editable ? (
        <p className="campaign-brief-actions__hint">{campaignBrief.editableHint}</p>
      ) : null}
    </div>
  );
}
