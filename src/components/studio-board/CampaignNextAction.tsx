"use client";

import Link from "next/link";

import { resolveIntakeEditHref } from "@/lib/intake-edit";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
import { studioBoard, type CampaignStatus } from "@/config/studio-board";
import {
  resolveBoardCampaignActions,
  resolveWhatHappensNextSentence,
  type StudioBoardDisplayFacts,
} from "@/lib/studio-board-view";
import {
  resolvePostSubmitCustomerMode,
  resolvePostSubmitNextActionCopy,
  resolveProductionGatePassedForCampaign,
} from "@/lib/post-submit-customer-signals";
import type { CampaignRecord } from "@/config/studio-board";

const { campaignActions: copy, nextAction: nextCopy } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
  hasCampaign: boolean;
  status: CampaignStatus | null;
  nextUpdateLabel?: string | null;
  studioGuideHref: string;
  displayFacts?: StudioBoardDisplayFacts;
};

/** Primary next step on Studio Board — always tells the customer what to do. */
export default function CampaignNextAction({
  campaign,
  hasCampaign,
  status,
  nextUpdateLabel,
  studioGuideHref,
  displayFacts,
}: Props) {
  if (!hasCampaign || !status) return null;

  const actions = resolveBoardCampaignActions(status, hasCampaign, { studioGuideHref });
  const primary = actions.find((action) => action.isPrimary);

  if (primary && status === "READY_FOR_REVIEW") {
    return (
      <div className="sb-next-action sb-next-action--review" role="status" aria-live="polite">
        <p className="sb-next-action__status">{nextCopy.conceptsReadyLabel}</p>
        <p className="sb-next-action__lead">{resolveWhatHappensNextSentence(campaign)}</p>
        <Link href={primary.href} className="utility-btn utility-btn--primary sb-next-action__cta">
          {nextCopy.reviewMyConcepts}
        </Link>
        <p className="sb-next-action__hint">{nextCopy.reviewConceptsHint}</p>
      </div>
    );
  }

  if (primary && status === "DELIVERED") {
    return (
      <div className="sb-next-action" role="status">
        <p className="sb-next-action__status">{nextCopy.packageReadyLabel}</p>
        <p className="sb-next-action__lead">{resolveWhatHappensNextSentence(campaign)}</p>
        <Link href={primary.href} className="utility-btn utility-btn--primary sb-next-action__cta">
          {nextCopy.openFinalDelivery}
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

  // Package 1b — paid incomplete Project Intake (do not change).
  if (status === "PAYMENT_RECEIVED" && campaign && !isIntakeComplete(campaign)) {
    return (
      <div className="sb-next-action" role="status" aria-live="polite">
        <p className="sb-next-action__status">{nextCopy.waitingOnProjectIntakeLabel}</p>
        <p className="sb-next-action__lead">{nextCopy.completeProjectDetailsHint}</p>
        <Link
          href={resolveIntakeEditHref(campaign, campaign.packageId)}
          className="utility-btn utility-btn--primary sb-next-action__cta"
        >
          {nextCopy.completeProjectDetails}
        </Link>
      </div>
    );
  }

  if (campaign && (status === "PAYMENT_RECEIVED" || status === "BUILDING_CONCEPTS")) {
    const blockingRequiredCount =
      displayFacts?.blockingRequiredCount ?? campaign.materialsSummary?.blockingRequiredCount ?? 0;
    const movedToProduction = displayFacts?.movedToProduction ?? false;
    const productionGatePassed =
      displayFacts?.productionGatePassed ??
      resolveProductionGatePassedForCampaign(campaign, {
        blockingRequiredCount,
        movedToProduction,
      });
    const facts = {
      productionGatePassed,
      blockingRequiredCount,
      stillNeededLabel: displayFacts?.stillNeededLabel ?? null,
    };
    const mode = resolvePostSubmitCustomerMode(campaign, facts);
    const honest = resolvePostSubmitNextActionCopy(mode, facts);

    if (honest) {
      return (
        <div className="sb-next-action sb-next-action--waiting" role="status" aria-live="polite">
          <p className="sb-next-action__status">{honest.statusLabel}</p>
          <p className="sb-next-action__lead">{honest.lead}</p>
          {honest.hint ? <p className="sb-next-action__hint">{honest.hint}</p> : null}
        </div>
      );
    }

    return (
      <div className="sb-next-action sb-next-action--waiting" role="status" aria-live="polite">
        <p className="sb-next-action__status">
          {status === "BUILDING_CONCEPTS"
            ? nextCopy.buildingConceptsLabel
            : nextCopy.paymentReceivedLabel}
        </p>
        <p className="sb-next-action__lead">
          {resolveWhatHappensNextSentence(campaign, displayFacts)}
        </p>
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
