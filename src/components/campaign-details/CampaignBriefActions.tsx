"use client";

import Link from "next/link";

import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { resolveVisionData } from "@/lib/campaign-record";
import { draftRoomEditHref, isIntakeEditable } from "@/lib/intake-edit";

const { campaignBrief, routes } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
  /** Opens the Campaign Record drawer when provided; otherwise links to Studio Board. */
  onViewBrief?: () => void;
  /** Hide the view action when the customer is already on the brief surface. */
  showView?: boolean;
  className?: string;
  layout?: "row" | "stack";
};

/** View / edit campaign brief — intake editable until concepting begins. */
export default function CampaignBriefActions({
  campaign,
  onViewBrief,
  showView = true,
  className = "",
  layout = "row",
}: Props) {
  if (!campaign || !resolveVisionData(campaign)) return null;

  const editable = isIntakeEditable(campaign.campaignStatus);
  const editHref = draftRoomEditHref(campaign.packageId);
  const rootClass = [
    "campaign-brief-actions",
    layout === "stack" ? "campaign-brief-actions--stack" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      {showView ? (
        onViewBrief ? (
          <button type="button" className="utility-btn utility-btn--secondary" onClick={onViewBrief}>
            {campaignBrief.viewLabel}
          </button>
        ) : (
          <Link href={routes.campaignDetails} className="utility-btn utility-btn--secondary">
            {campaignBrief.viewLabel}
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
