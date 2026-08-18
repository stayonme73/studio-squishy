"use client";

import type { ReactNode } from "react";

import type {
  FeedbackSectionId,
  FeedbackSession,
  FeedbackStickyNote,
  FeedbackTool,
  SectionReviewStatus,
} from "@/config/feedback-studio";
import { feedbackStudio, isJobReviewClosedSpine, resolveFeedbackSectionLabel } from "@/config/feedback-studio";
import { customerVisibleFileFormatLabel } from "@/config/deliverables";
import { studioReviewRevisionFullLoopV1 } from "@/config/studio-review-revision-full-loop-v1";
import type { ClientReviewDeliverable } from "@/lib/job-control/review-feedback-types";
import { deliverableKeyToSectionId } from "@/lib/review-room-client";
import { sortProofsByAddedAtDesc } from "@/lib/job-control/version-compare";

import FeedbackStudioDrawLayer from "./FeedbackStudioDrawLayer";
import JobReviewVersionCompare from "./JobReviewVersionCompare";
import JobReviewHighlightBoard from "./JobReviewHighlightBoard";
import JobReviewTextCommentPanel from "./JobReviewTextCommentPanel";
import type {
  JobReviewHighlight,
  JobReviewTextComment,
} from "@/lib/job-control/review-feedback-types";

type Props = {
  reviewTitle: string;
  serviceName: string;
  jobId: string;
  spineStatus: string;
  deliverables: readonly ClientReviewDeliverable[];
  focusedSection: FeedbackSectionId;
  visibleSectionIds: readonly FeedbackSectionId[];
  sectionLabels: Record<string, string>;
  activeTool: FeedbackTool;
  erasing: boolean;
  session: FeedbackSession;
  compareCurrentId: string | null;
  comparePriorId: string | null;
  highlightProofId: string | null;
  textCommentProofId: string | null;
  onFocusSection: (sectionId: FeedbackSectionId) => void;
  onDrawStroke: (sectionId: FeedbackSectionId) => void;
  onCompareSelectCurrent: (id: string) => void;
  onCompareSelectPrior: (id: string) => void;
  onHighlightSelectProof: (id: string) => void;
  onHighlightsChange: (next: readonly JobReviewHighlight[]) => void;
  onTextCommentSelectProof: (id: string) => void;
  onTextCommentsChange: (next: readonly JobReviewTextComment[]) => void;
};

export default function JobReviewDeliverablePreview({
  reviewTitle,
  serviceName,
  jobId,
  spineStatus,
  deliverables,
  focusedSection,
  visibleSectionIds,
  sectionLabels,
  activeTool,
  erasing,
  session,
  compareCurrentId,
  comparePriorId,
  highlightProofId,
  textCommentProofId,
  onFocusSection,
  onDrawStroke,
  onCompareSelectCurrent,
  onCompareSelectPrior,
  onHighlightSelectProof,
  onHighlightsChange,
  onTextCommentSelectProof,
  onTextCommentsChange,
}: Props) {
  const deliverableByKey = new Map<string, ClientReviewDeliverable>(
    deliverables.map((entry) => [deliverableKeyToSectionId(entry.key), entry]),
  );

  const reviewClosed = isJobReviewClosedSpine(spineStatus);
  const summary = reviewClosed
    ? feedbackStudio.jobReview.submittedApproval
    : spineStatus === "revision_requested"
      ? feedbackStudio.jobReview.submittedRevision
      : feedbackStudio.jobReview.pickerLead;
  const subhead = reviewClosed
    ? feedbackStudio.jobReview.submittedApproval
    : spineStatus === "revision_requested"
      ? feedbackStudio.jobReview.submittedRevision
      : feedbackStudio.jobReview.deliverableReady;

  return (
    <div className="fs-preview fs-preview--workspace">
      <header className="fs-preview__header">
        <p className="fs-preview__eyebrow">
          {feedbackStudio.jobReview.serviceLabel} · {serviceName}
        </p>
        <h2 className="fs-preview__title">{reviewTitle}</h2>
        <p className="fs-preview__summary">{summary}</p>
      </header>

      {visibleSectionIds.map((sectionId) => {
        const deliverable = deliverableByKey.get(sectionId);
        if (!deliverable) return null;

        const label = resolveFeedbackSectionLabel(sectionId, sectionLabels);
        const status = session.sectionStatuses[sectionId] ?? "neutral";
        const focused = focusedSection === sectionId;
        const currentProof = sortProofsByAddedAtDesc(deliverable.proofFiles)[0] ?? null;

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
              <p className="fs-mock__subhead">{subhead}</p>
              {currentProof ? (
                <p className="fs-mock__meta">
                  {reviewClosed
                    ? studioReviewRevisionFullLoopV1.customerCopy.approvedVersionLead(
                        currentProof.versionLabel,
                      )
                    : studioReviewRevisionFullLoopV1.customerCopy.currentVersionLead(
                        currentProof.versionLabel,
                      )}
                </p>
              ) : deliverable.preparedAt ? (
                <p className="fs-mock__meta">
                  Prepared {new Date(deliverable.preparedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              ) : null}
              {currentProof?.accessHref ? (
                <figure className="fs-review-proof">
                  <img
                    src={currentProof.accessHref}
                    alt={studioReviewRevisionFullLoopV1.customerCopy.reviewProofAlt(
                      reviewTitle,
                      currentProof.versionLabel,
                    )}
                    className="fs-review-proof__image"
                  />
                </figure>
              ) : null}
              {activeTool === "compare" && focused ? (
                <JobReviewVersionCompare
                  proofFiles={deliverable.proofFiles}
                  currentId={compareCurrentId}
                  priorId={comparePriorId}
                  onSelectCurrent={onCompareSelectCurrent}
                  onSelectPrior={onCompareSelectPrior}
                />
              ) : null}
              {activeTool === "highlight" && focused ? (
                <JobReviewHighlightBoard
                  jobId={jobId}
                  deliverableKey={deliverable.key}
                  proofFiles={deliverable.proofFiles}
                  selectedProofId={highlightProofId}
                  highlights={(session.highlights ?? []) as JobReviewHighlight[]}
                  onSelectProof={onHighlightSelectProof}
                  onHighlightsChange={onHighlightsChange}
                />
              ) : null}
              {activeTool === "textComment" && focused ? (
                <JobReviewTextCommentPanel
                  jobId={jobId}
                  deliverableKey={deliverable.key}
                  proofFiles={deliverable.proofFiles}
                  selectedProofId={textCommentProofId}
                  comments={(session.textComments ?? []) as JobReviewTextComment[]}
                  onSelectProof={onTextCommentSelectProof}
                  onCommentsChange={onTextCommentsChange}
                />
              ) : null}
              {deliverable.proofFiles.length > 0 ? (
                <div className="fs-proof-refs" aria-label={`${deliverable.label} recorded versions`}>
                  <p className="fs-proof-refs__label">
                    {studioReviewRevisionFullLoopV1.customerCopy.proofRefsLabel}
                  </p>
                  <ul>
                    {deliverable.proofFiles.map((file) => {
                      const isCurrent = currentProof?.id === file.id;
                      const versionState = isCurrent
                        ? feedbackStudio.versionCompare.currentLabel
                        : feedbackStudio.versionCompare.priorLabel;
                      const formatLabel = customerVisibleFileFormatLabel(
                        file.fileType,
                        file.filename,
                      );
                      return (
                      <li key={file.id}>
                        {file.accessHref ? (
                          <a href={file.accessHref} target="_blank" rel="noreferrer">
                            {file.filename}
                          </a>
                        ) : (
                          <span>{file.filename}</span>
                        )}
                        <span>
                          {versionState} · {file.versionLabel} · {formatLabel}
                        </span>
                      </li>
                      );
                    })}
                  </ul>
                </div>
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
