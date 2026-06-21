"use client";

import Link from "next/link";

import {
  campaignJourneyMap,
  campaignJourneyStepIndex,
  isCampaignJourneyStepAccessible,
  resolveCampaignJourneyVisualState,
  type CampaignJourneyStepId,
} from "@/config/campaign-journey-map";
import type { CampaignStatus } from "@/config/studio-board";

function StepMarker({ state }: { state: "complete" | "current" | "upcoming" }) {
  if (state === "complete") {
    return (
      <span className="cjm__marker cjm__marker--complete" aria-hidden>
        ✓
      </span>
    );
  }

  if (state === "current") {
    return <span className="cjm__marker cjm__marker--current" aria-hidden />;
  }

  return <span className="cjm__marker cjm__marker--upcoming" aria-hidden />;
}

/** Route nav between Board Family pages (Details → Review → Delivery).
 *  Distinct from JourneyRail on Studio Board, which shows production pipeline status. */
export default function CampaignJourneyMap({
  activeStep,
  status,
  hasCampaign,
}: {
  activeStep: CampaignJourneyStepId;
  status: CampaignStatus | null;
  hasCampaign: boolean;
}) {
  if (!hasCampaign || !status) return null;

  const activeStepIndex = campaignJourneyStepIndex(activeStep);

  return (
    <nav
      className="cjm cjm--utility"
      aria-label={campaignJourneyMap.title}
    >
      <p className="cjm__title">{campaignJourneyMap.title}</p>
      <ol className="cjm__list">
        {campaignJourneyMap.steps.map((step, index) => {
          const visualState = resolveCampaignJourneyVisualState(index, activeStepIndex);
          const accessible = isCampaignJourneyStepAccessible(index, status, hasCampaign);
          const isCurrent = visualState === "current";

          const content = (
            <>
              <StepMarker state={visualState} />
              <span className="cjm__label">{step.label}</span>
            </>
          );

          return (
            <li
              key={step.id}
              className={`cjm__item cjm__item--${visualState}${accessible ? "" : " cjm__item--locked"}`}
            >
              {accessible ? (
                <Link
                  href={step.href}
                  className="cjm__link"
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {content}
                </Link>
              ) : (
                <span className="cjm__link cjm__link--disabled" aria-disabled="true">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
