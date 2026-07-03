"use client";

import type { ReactNode } from "react";

import type {
  FeedbackSectionId,
  FeedbackSession,
  FeedbackStickyNote,
  FeedbackTool,
  SectionReviewStatus,
} from "@/config/feedback-studio";
import { feedbackStudio, resolveFeedbackSectionLabel } from "@/config/feedback-studio";
import type { ClientReviewDeliverable } from "@/lib/job-control/review-feedback-types";
import { deliverableKeyToSectionId } from "@/lib/review-room-client";

import FeedbackStudioDrawLayer from "./FeedbackStudioDrawLayer";

type Props = {
  reviewTitle: string;
  serviceName: string;
  deliverables: readonly ClientReviewDeliverable[];
  focusedSection: FeedbackSectionId;
  visibleSectionIds: readonly FeedbackSectionId[];
  sectionLabels: Record<string, string>;
  activeTool: FeedbackTool;
  erasing: boolean;
  session: FeedbackSession;
  onFocusSection: (sectionId: FeedbackSectionId) => void;
  onDrawStroke: (sectionId: FeedbackSectionId) => void;
};

export default function JobReviewDeliverablePreview({
  reviewTitle,
  serviceName,
  deliverables,
  focusedSection,
  visibleSectionIds,
  sectionLabels,
  activeTool,
  erasing,
  session,
  onFocusSection,
  onDrawStroke,
}: Props) {
  const deliverableByKey = new Map<string, ClientReviewDeliverable>(
    deliverables.map((entry) => [deliverableKeyToSectionId(entry.key), entry]),
  );

  return (
    <div className="fs-preview fs-preview--workspace">
      <header className="fs-preview__header">
        <p className="fs-preview__eyebrow">
          {feedbackStudio.jobReview.serviceLabel} · {serviceName}
        </p>
        <h2 className="fs-preview__title">{reviewTitle}</h2>
        <p className="fs-preview__summary">{feedbackStudio.jobReview.pickerLead}</p>
      </header>

      {visibleSectionIds.map((sectionId) => {
        const deliverable = deliverableByKey.get(sectionId);
        if (!deliverable) return null;

        const label = resolveFeedbackSectionLabel(sectionId, sectionLabels);
        const status = session.sectionStatuses[sectionId] ?? "neutral";
        const focused = focusedSection === sectionId;

        return (
          <PreviewSection
            key={sectionId}
            sectionId={sectionId}
            label={label}
            focused={focused}
            status={status}
            onFocus={() => onFocusSection(sectionId)}
            drawActive={activeTool === "draw" && focused}
            erasing={erasing}
            onDrawStroke={() => onDrawStroke(sectionId)}
            stickies={session.stickyNotes.filter((note) => note.sectionId === sectionId)}
          >
            <div className="fs-mock fs-mock--deliverable fs-mock--large">
              <p className="fs-mock__headline">{deliverable.label}</p>
              <p className="fs-mock__subhead">{feedbackStudio.jobReview.deliverableReady}</p>
              {deliverable.preparedAt ? (
                <p className="fs-mock__meta">
                  Prepared {new Date(deliverable.preparedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              ) : null}
              <div className="fs-mock__hero-art fs-mock__hero-art--deliverable" aria-hidden />
            </div>
          </PreviewSection>
        );
      })}
    </div>
  );
}

function PreviewSection({
  sectionId,
  label,
  focused,
  status,
  onFocus,
  drawActive,
  erasing,
  onDrawStroke,
  stickies,
  children,
}: {
  sectionId: FeedbackSectionId;
  label: string;
  focused: boolean;
  status: SectionReviewStatus;
  onFocus: () => void;
  drawActive: boolean;
  erasing: boolean;
  onDrawStroke: () => void;
  stickies: FeedbackStickyNote[];
  children: ReactNode;
}) {
  const { sectionStatus } = feedbackStudio;

  return (
    <section
      className={`fs-preview__section${focused ? " fs-preview__section--focused" : ""}`}
      aria-labelledby={`section-${sectionId}`}
    >
      <button
        type="button"
        className="fs-preview__section-head"
        onClick={onFocus}
        id={`section-${sectionId}`}
      >
        <span className="fs-preview__section-label">{label}</span>
        {status !== "neutral" ? (
          <span className={`fs-preview__status fs-preview__status--${status}`}>
            {sectionStatus[status]}
          </span>
        ) : null}
      </button>

      <div className="fs-preview__section-body">
        {children}
        {stickies.map((note) => (
          <div
            key={note.id}
            className={`fs-sticky fs-sticky--${note.color}`}
            style={{ position: "absolute", top: "1rem", right: "1rem" }}
          >
            {note.text}
          </div>
        ))}
        {drawActive ? (
          <FeedbackStudioDrawLayer active erasing={erasing} onStroke={onDrawStroke} />
        ) : null}
      </div>
    </section>
  );
}
