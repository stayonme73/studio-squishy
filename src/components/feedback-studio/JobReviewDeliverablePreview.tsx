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
import { isCopyReviewProofFile } from "@/lib/studio-copy-review-bind/customer-facing";

import FeedbackStudioDrawLayer from "./FeedbackStudioDrawLayer";
import ReviewCopyReading from "./ReviewCopyReading";
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
  onCompareToggle?: () => void;
  stickyPlaceActive?: boolean;
  pendingStickyAnchor?: { x: number; y: number } | null;
  stickyDraft?: string;
  onPlaceSticky?: (x: number, y: number) => void;
  drawResetKey?: number;
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
  onCompareToggle,
  stickyPlaceActive = false,
  pendingStickyAnchor = null,
  stickyDraft = "",
  onPlaceSticky,
  drawResetKey = 0,
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
  const currentVersionLabel =
    sortProofsByAddedAtDesc(deliverables[0]?.proofFiles ?? [])[0]?.versionLabel ?? null;
  const phoneCopy = feedbackStudio.feedbackPanel.phoneCustomerRevision;

  return (
    <div className="fs-preview fs-preview--workspace">
      <header className="fs-preview__header">
        <p className="fs-preview__eyebrow fs-preview__eyebrow--desktop">{serviceName}</p>
        <h2 className="fs-preview__title">{reviewTitle}</h2>
        <p className="fs-preview__phone-meta">
          {serviceName}
          {currentVersionLabel ? ` • ${currentVersionLabel}` : ""}
        </p>
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
            stickies={session.stickyNotes.filter((note) => note.sectionId === sectionId)}
          >
            <div className="fs-mock fs-mock--deliverable fs-mock--large">
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
              ) : (
                <>
                  <p className="fs-mock__headline">{deliverable.label}</p>
                  <p className="fs-mock__subhead">{subhead}</p>
                  {deliverable.preparedAt ? (
                    <p className="fs-mock__meta">
                      Prepared {new Date(deliverable.preparedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  ) : null}
                </>
              )}
              {currentProof?.accessHref ? (
                <figure
                  className={`fs-review-proof${stickyPlaceActive && focused ? " fs-review-proof--place" : ""}${
                    activeTool === "draw" && focused ? " fs-review-proof--draw" : ""
                  }`}
                  onClick={(event) => {
                    if (!stickyPlaceActive || !onPlaceSticky || !focused) return;
                    if (activeTool === "draw") return;
                    const target = event.target;
                    if (target instanceof HTMLElement && target.closest("textarea, .fs-sticky")) {
                      return;
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
                    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
                    onPlaceSticky(x, y);
                  }}
                >
                  {currentProof.fileType === "video/mp4" ||
                  currentProof.fileType.startsWith("video/") ||
                  /\.mp4$/i.test(currentProof.filename) ? (
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      src={currentProof.accessHref}
                      className="fs-review-proof__video"
                      aria-label={`${serviceName}, ${label}, ${currentProof.versionLabel}.`}
                    >
                      Your browser cannot play this video. Use the download link under Versions of this work.
                    </video>
                  ) : isCopyReviewProofFile(currentProof.fileType, currentProof.filename) ? (
                    <ReviewCopyReading
                      url={currentProof.accessHref}
                      title={`${serviceName}, ${label}, ${currentProof.versionLabel}.`}
                    />
                  ) : (
                    <img
                      src={currentProof.accessHref}
                      alt={`${serviceName}, ${label}, ${currentProof.versionLabel}.`}
                      className="fs-review-proof__image"
                    />
                  )}
                  {session.stickyNotes
                    .filter((note) => note.sectionId === sectionId)
                    .map((note) =>
                      typeof note.anchorX === "number" && typeof note.anchorY === "number" ? (
                        <div
                          key={note.id}
                          className={`fs-sticky fs-sticky--${note.color} fs-sticky--anchored`}
                          style={{ left: `${note.anchorX * 100}%`, top: `${note.anchorY * 100}%` }}
                        >
                          {note.text}
                        </div>
                      ) : null,
                    )}
                  {stickyPlaceActive && focused && pendingStickyAnchor ? (
                    <div
                      className="fs-sticky fs-sticky--phone fs-sticky--anchored fs-sticky--pending"
                      style={{
                        left: `${pendingStickyAnchor.x * 100}%`,
                        top: `${pendingStickyAnchor.y * 100}%`,
                      }}
                    >
                      {stickyDraft.trim() || "Note"}
                    </div>
                  ) : null}
                  {activeTool === "draw" && focused ? (
                    <FeedbackStudioDrawLayer
                      key={drawResetKey}
                      active
                      erasing={erasing}
                      onStroke={() => onDrawStroke(sectionId)}
                    />
                  ) : null}
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
                <>
                  <details className="fs-proof-refs fs-proof-refs--phone" aria-label={`${deliverable.label} recorded versions`}>
                    <summary className="fs-proof-refs__summary">
                      {currentProof?.versionLabel ?? studioReviewRevisionFullLoopV1.customerCopy.proofRefsLabel}
                    </summary>
                    <ProofVersionList
                      proofFiles={deliverable.proofFiles}
                      currentProofId={currentProof?.id ?? null}
                    />
                    {onCompareToggle && deliverable.proofFiles.length > 1 ? (
                      <button
                        type="button"
                        className="utility-btn utility-btn--secondary fs-proof-refs__compare"
                        onClick={onCompareToggle}
                      >
                        {phoneCopy.compareVersions}
                      </button>
                    ) : null}
                  </details>
                  <details className="fs-proof-refs fs-proof-refs--desktop" aria-label={`${deliverable.label} recorded versions`}>
                    <summary className="fs-proof-refs__summary">
                      {studioReviewRevisionFullLoopV1.customerCopy.proofRefsLabel}
                    </summary>
                    <ProofVersionList
                      proofFiles={deliverable.proofFiles}
                      currentProofId={currentProof?.id ?? null}
                    />
                  </details>
                </>
              ) : null}
              <div className="fs-mock__hero-art fs-mock__hero-art--deliverable" aria-hidden />
            </div>
          </PreviewSection>
        );
      })}
    </div>
  );
}

function ProofVersionList({
  proofFiles,
  currentProofId,
}: {
  proofFiles: ClientReviewDeliverable["proofFiles"];
  currentProofId: string | null;
}) {
  return (
    <ul>
      {proofFiles.map((file) => {
        const isCurrent = currentProofId === file.id;
        const versionState = isCurrent
          ? feedbackStudio.versionCompare.currentLabel
          : feedbackStudio.versionCompare.priorLabel;
        const formatLabel = customerVisibleFileFormatLabel(file.fileType, file.filename);
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
  );
}

function PreviewSection({
  sectionId,
  label,
  focused,
  status,
  onFocus,
  stickies,
  children,
}: {
  sectionId: FeedbackSectionId;
  label: string;
  focused: boolean;
  status: SectionReviewStatus;
  onFocus: () => void;
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
        {stickies
          .filter((note) => typeof note.anchorX !== "number" || typeof note.anchorY !== "number")
          .map((note) => (
          <div
            key={note.id}
            className={`fs-sticky fs-sticky--${note.color}`}
            style={{ position: "absolute", top: "1rem", right: "1rem" }}
          >
            {note.text}
          </div>
        ))}
      </div>
    </section>
  );
}
