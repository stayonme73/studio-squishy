"use client";

import Link from "next/link";
import { type CSSProperties, useRef } from "react";

import CampaignJourneyRoadmap from "@/components/studio-board/CampaignJourneyRoadmap";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import type { ActivityFeedEntry } from "@/lib/campaign-record";
import type { CampaignProgressStep } from "@/lib/studio-board-view";

import ProgressStageIcon from "@/components/studio-board/ProgressStageIcon";
import { useStudioNoteFitScale } from "@/components/studio-board/useStudioNoteFitScale";

const { progressCard: copy, activityFeed: timelineCopy } = studioBoard;

type Props = {
  campaign: CampaignRecord | null;
  steps: readonly CampaignProgressStep[];
  timeline: readonly ActivityFeedEntry[];
};

type ProgressBodyProps = {
  campaign: CampaignRecord | null;
  steps: readonly CampaignProgressStep[];
  recentUpdates: readonly ActivityFeedEntry[];
};

function ProgressBody({ campaign, steps, recentUpdates }: ProgressBodyProps) {
  return (
    <>
      <CampaignJourneyRoadmap campaign={campaign} />

      <details className="sb-progress-panel__pipeline">
        <summary className="sb-progress-panel__pipeline-summary">Production status</summary>
        <ol className="sb-progress-timeline">
          {steps.map((step) => {
            const stepCopy = (
              <>
                <span className="sb-progress-timeline__icon" aria-hidden>
                  <ProgressStageIcon stage={step.id} />
                </span>
                <div className="sb-progress-timeline__copy">
                  <span className="sb-progress-timeline__label">{step.label}</span>
                  {step.detail ? (
                    <span className="sb-progress-timeline__detail">{step.detail}</span>
                  ) : null}
                </div>
              </>
            );

            return (
              <li
                key={step.id}
                className={`sb-progress-timeline__step sb-progress-timeline__step--${step.state}`}
              >
                {step.href ? (
                  <Link href={step.href} className="sb-progress-timeline__link">
                    {stepCopy}
                  </Link>
                ) : (
                  stepCopy
                )}
                {step.state === "current" && step.actionLabel && step.href ? (
                  <Link href={step.href} className="utility-btn utility-btn--primary sb-progress-timeline__cta">
                    {step.actionLabel}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ol>
      </details>

      {recentUpdates.length > 0 ? (
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
      ) : (
        <p className="sb-progress-panel__timeline-empty">{timelineCopy.emptyHint}</p>
      )}
    </>
  );
}

/** Journey stages plus recent timeline updates — scales to fit the card. */
export default function CampaignProgressPanel({ campaign, steps, timeline }: Props) {
  const recentUpdates = timeline.slice(0, 3);
  const contentKey = [
    steps.map((step) => `${step.id}:${step.state}:${step.detail ?? ""}`).join("|"),
    recentUpdates.map((entry) => `${entry.date}:${entry.message}`).join("|"),
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
          <ProgressBody campaign={campaign} steps={steps} recentUpdates={recentUpdates} />
        </div>

        <div ref={measureRef} className="sb-progress-panel__measure" aria-hidden="true">
          <ProgressBody campaign={campaign} steps={steps} recentUpdates={recentUpdates} />
        </div>
      </div>
    </section>
  );
}
