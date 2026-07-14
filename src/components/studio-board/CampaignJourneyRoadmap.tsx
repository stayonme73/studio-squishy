"use client";

import type { CampaignRecord } from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import {
  resolveCustomerJourneySteps,
  type CustomerJourneyStep,
} from "@/lib/customer-journey";
import {
  PROJECT_INTAKE_RECEIVED_STATUS,
  mayShowBuildingConceptsCustomerCopy,
  resolveProductionGatePassedForCampaign,
} from "@/lib/post-submit-customer-signals";
import type { StudioBoardDisplayFacts } from "@/lib/studio-board-view";

const { progressCard: copy } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
  displayFacts?: StudioBoardDisplayFacts;
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

function resolveCurrentStepDetail(
  step: CustomerJourneyStep,
  campaign: CampaignRecord | null,
  displayFacts?: StudioBoardDisplayFacts,
): string {
  if (step.id === "building" && campaign) {
    const blockingRequiredCount =
      displayFacts?.blockingRequiredCount ?? campaign.materialsSummary?.blockingRequiredCount ?? 0;
    const movedToProduction = displayFacts?.movedToProduction ?? false;
    const productionGatePassed =
      displayFacts?.productionGatePassed ??
      resolveProductionGatePassedForCampaign(campaign, {
        blockingRequiredCount,
        movedToProduction,
      });
    if (
      !mayShowBuildingConceptsCustomerCopy(campaign, {
        productionGatePassed,
        blockingRequiredCount,
      })
    ) {
      return PROJECT_INTAKE_RECEIVED_STATUS;
    }
    return studioBoard.nextAction.buildingConceptsLabel;
  }
  if (step.id === "review") return studioBoard.nextAction.conceptsReadyLabel;
  return "In progress";
}

/** Customer roadmap — where they are and what to do next. */
export default function CampaignJourneyRoadmap({ campaign, displayFacts }: Props) {
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
                  {resolveCurrentStepDetail(step, campaign, displayFacts)}
                </span>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
