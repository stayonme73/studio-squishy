"use client";

import Link from "next/link";

import { studioBoard, type CampaignStatus } from "@/config/studio-board";
import {
  resolveBoardCampaignActions,
  resolveWhatHappensNextSentence,
} from "@/lib/studio-board-view";
import type { CampaignRecord } from "@/config/studio-board";

const { campaignActions: copy, nextAction: nextCopy } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
  hasCampaign: boolean;
  status: CampaignStatus | null;
  nextUpdateLabel?: string | null;
  studioGuideHref: string;
};

/** Primary next step on Studio Board — always tells the customer what to do. */
export default function CampaignNextAction({
  campaign,
  hasCampaign,
  status,
  nextUpdateLabel,
  studioGuideHref,
}: Props) {
  if (!hasCampaign || !status) return null;

  const actions = resolveBoardCampaignActions(status, hasCampaign, { studioGuideHref });
  const primary = actions.find((action) => action.isPrimary);

  if (primary && status === "READY_FOR_REVIEW") {
    return (
      <div className="sb-next-action" role="status" aria-live="polite">
        <p className="sb-next-action__status">{nextCopy.conceptsReadyLabel}</p>
        <p className="sb-next-action__lead">{resolveWhatHappensNextSentence(campaign)}</p>
        <Link href={primary.href} className="utility-btn utility-btn--primary sb-next-action__cta">
          {nextCopy.reviewMyConcepts}
        </Link>
      </div>
    );
  }

  if (primary && status === "DELIVERED") {
    return (
      <div className="sb-next-action" role="status">
        <p className="sb-next-action__lead">{resolveWhatHappensNextSentence(campaign)}</p>
        <Link href={primary.href} className="utility-btn utility-btn--primary sb-next-action__cta">
          {primary.label}
        </Link>
      </div>
    );
  }

  if (primary && status === "DRAFT_RECEIVED") {
    return (
      <div className="sb-next-action" role="status">
        <p className="sb-next-action__lead">{resolveWhatHappensNextSentence(campaign)}</p>
        <Link href={primary.href} className="utility-btn utility-btn--primary sb-next-action__cta">
          {nextCopy.choosePackage}
        </Link>
      </div>
    );
  }

  if (status === "PAYMENT_RECEIVED" || status === "BUILDING_CONCEPTS") {
    return (
      <div className="sb-next-action sb-next-action--waiting" role="status" aria-live="polite">
        <p className="sb-next-action__status">
          {status === "BUILDING_CONCEPTS"
            ? nextCopy.buildingConceptsLabel
            : nextCopy.paymentReceivedLabel}
        </p>
        <p className="sb-next-action__lead">{resolveWhatHappensNextSentence(campaign)}</p>
        <p className="sb-next-action__hint">
          {status === "BUILDING_CONCEPTS"
            ? nextCopy.buildingConceptsHint
            : nextCopy.paymentReceivedHint}
        </p>
        {nextUpdateLabel ? (
          <p className="sb-next-action__eta">
            {copy.nextUpdatePrefix} {nextUpdateLabel}
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}
