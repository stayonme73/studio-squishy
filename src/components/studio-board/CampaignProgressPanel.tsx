"use client";

import { type CSSProperties, useRef } from "react";

import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import type { ActivityFeedEntry } from "@/lib/campaign-record";
import type { CampaignProgressStep, StudioBoardDisplayFacts } from "@/lib/studio-board-view";

import ProgressStageIcon from "@/components/studio-board/ProgressStageIcon";
import { useStudioNoteFitScale } from "@/components/studio-board/useStudioNoteFitScale";

const { progressCard: copy, activityFeed: timelineCopy } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
  steps: readonly CampaignProgressStep[];
  timeline: readonly ActivityFeedEntry[];
  displayFacts?: StudioBoardDisplayFacts;
};

type ProgressBodyProps = {
  steps: readonly CampaignProgressStep[];
  recentUpdates: readonly ActivityFeedEntry[];
};

function ProgressBody({ steps, recentUpdates }: ProgressBodyProps) {
  return (
    <>
      <ol className="sb-progress-timeline" aria-label={copy.journeyHeading}>
        {steps.map((step) => (
          <li
            key={step.id}
            className={`sb-progress-timeline__step sb-progress-timeline__step--${step.state}${
              step.id === "DISCOVERY_COMPLETE" ? " sb-progress-timeline__step--summary-ready" : ""
            }`}
          >
            <span className="sb-progress-timeline__icon" aria-hidden>
              <ProgressStageIcon stage={step.id} />
            </span>
            <div className="sb-progress-timeline__copy">
              <span className="sb-progress-timeline__label">{step.label}</span>
              {step.detail ? (
                <span className="sb-progress-timeline__detail">{step.detail}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {steps.length === 0 && recentUpdates.length > 0 ? (
        <div className="sb-progress-panel__timeline">
          <p className="sb-progress-panel__timeline-heading">{copy.timelineHeading}</p>
          <ul className="sb-progress-panel__updates">
            {recentUpdates.map((entry, index) => (
              <li key={`${entry.date}-${entry.message}-${index}`} className="sb-progress-panel__update">
                <span className="sb-progress-panel__update-date">{entry.date}</span>
                <span className="sb-progress-panel__update-message">{entry.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : steps.length === 0 ? (
        <p className="sb-progress-panel__timeline-empty">{timelineCopy.emptyHint}</p>
      ) : null}
    </>
  );
}

/** Journey stages plus recent timeline updates — scales to fit the card. */
export default function CampaignProgressPanel({ steps, timeline, displayFacts }: Props) {
  const recentUpdates = timeline.slice(0, 3);
  const contentKey = [
    steps.map((step) => `${step.id}:${step.state}:${step.detail ?? ""}`).join("|"),
    recentUpdates.map((entry) => `${entry.date}:${entry.message}`).join("|"),
    displayFacts?.movedToProduction ? "moved" : "waiting",
    String(displayFacts?.blockingRequiredCount ?? ""),
  ].join("::");

  const panelRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const fitScale = useStudioNoteFitScale(panelRef, measureRef, contentKey);

  return (
    <section className="sb-progress-panel" aria-labelledby="sb-progress-title">
      <p id="sb-progress-title" className="sb-card__tab">
        {copy.journeyHeading}
      </p>

      <div
        ref={panelRef}
        className="sb-progress-panel__body"
        style={{ "--sb-progress-fit-scale": fitScale } as CSSProperties}
      >
        <div className="sb-progress-panel__fit">
          <ProgressBody
            steps={steps}
            recentUpdates={recentUpdates}
          />
        </div>

        <div ref={measureRef} className="sb-progress-panel__measure" aria-hidden="true">
          <ProgressBody
            steps={steps}
            recentUpdates={recentUpdates}
          />
        </div>
      </div>
    </section>
  );
}
