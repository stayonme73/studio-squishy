"use client";

import type { CampaignRecord } from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import {
  resolveCustomerJourneySteps,
  type CustomerJourneyStep,
} from "@/lib/customer-journey";

const { progressCard: copy } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
};

function StepMarker({ state }: { state: CustomerJourneyStep["state"] }) {
  if (state === "complete") {
    return (
      <span className="sb-journey__marker sb-journey__marker--complete" aria-hidden>
        ✓
      </span>
    );
  }
  if (state === "current") {
    return <span className="sb-journey__marker sb-journey__marker--current" aria-hidden />;
  }
  return <span className="sb-journey__marker sb-journey__marker--upcoming" aria-hidden />;
}

/** Customer roadmap — where they are and what to do next. */
export default function CampaignJourneyRoadmap({ campaign }: Props) {
  const steps = resolveCustomerJourneySteps(campaign);

  return (
    <ol className="sb-journey" aria-label={copy.journeyHeading}>
      {steps.map((step) => (
        <li
          key={step.id}
          className={`sb-journey__step sb-journey__step--${step.state}`}
        >
          <div className="sb-journey__row">
            <StepMarker state={step.state} />
            <div className="sb-journey__copy">
              <span className="sb-journey__label">{step.label}</span>
          {step.state === "current" && !step.actionLabel ? (
                <span className="sb-journey__detail">
                  {step.id === "review" ? studioBoard.nextAction.conceptsReadyLabel : "In progress"}
                </span>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
