"use client";

import Link from "next/link";
import { useState } from "react";

import { draftRoom } from "@/config/draft-room";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { readCurrentCampaign } from "@/lib/studio-board-campaign";

type Props = {
  packageId?: StudioGuidePackageId;
  onReviewAnswers: () => void;
};

/** Post-submit thank-you — user chooses next step or reviews answers. */
export default function DraftIntakeConfirmation({ packageId, onReviewAnswers }: Props) {
  const { confirmation, routes } = draftRoom;
  const [acknowledged, setAcknowledged] = useState(false);

  const paidFirst = Boolean(readCurrentCampaign()?.paymentReceivedAt);
  const continueHref = paidFirst
    ? routes.studioBoard
    : packageId
      ? `${routes.studioGuide}?package=${packageId}`
      : routes.studioGuide;
  const continueLabel = paidFirst ? confirmation.studioBoard : confirmation.studioGuide;
  const policyLine = paidFirst
    ? "Payment is confirmed. The Studio will review your intake and begin shaping your campaign concepts."
    : confirmation.policyLine;
  const packagePrompt = paidFirst
    ? "Next step:\nhead to your Studio Board to track progress."
    : confirmation.packagePrompt;
  const continueHint = paidFirst ? confirmation.studioBoardHint : confirmation.studioGuideHint;

  return (
    <div className="dri-intake-shell dri-confirmation-shell">
      <div className="dri-confirmation-body">
        <div className="dri-step-content dri-step-content--confirmation">
          <p className="dri-eyebrow">{confirmation.eyebrow}</p>
          <h2 id="dri-confirmation-title" className="dri-title">
            {confirmation.titleThanks}
          </h2>
          <p className="dri-lead">{confirmation.titleLine}</p>
          <p className="dri-body">{confirmation.body}</p>
          <p className="dri-body dri-body--policy">{policyLine}</p>
          <p className="dri-support dri-support--confirmation">{packagePrompt}</p>

          <label className="dri-confirmation-check">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>{confirmation.acknowledgment}</span>
          </label>
        </div>
      </div>

      <div className="dri-confirmation-footer">
        <div className="dri-intake-nav dri-intake-nav--confirmation">
          <div className="dri-intake-nav__back">
            <button type="button" className="utility-btn utility-btn--secondary" onClick={onReviewAnswers}>
              {confirmation.reviewAnswers}
            </button>
          </div>
          <div className="dri-intake-nav__continue">
            <Link
              href={continueHref}
              className={`utility-btn utility-btn--primary${acknowledged ? "" : " utility-btn--disabled"}`}
              aria-disabled={!acknowledged}
              tabIndex={acknowledged ? 0 : -1}
              onClick={(event) => {
                if (!acknowledged) event.preventDefault();
              }}
            >
              {continueLabel}
            </Link>
          </div>
        </div>

        <p className="dri-confirmation-hint">
          <Link href={routes.welcomeHall} className="utility-topbar__help">
            {confirmation.welcomeHall}
          </Link>
        </p>
        <p className="dri-confirmation-hint">{continueHint}</p>
      </div>
    </div>
  );
}
