"use client";

import { useEffect, useRef } from "react";

import type {
  FeedbackSectionId,
  FeedbackSession,
  FeedbackStickyNote,
  FeedbackTool,
  FeedbackVoiceNote,
  SectionReviewStatus,
  StickyNoteColorId,
} from "@/config/feedback-studio";
import { feedbackStudio, resolveFeedbackSectionLabel } from "@/config/feedback-studio";

type ComposerKind = "none" | "revision" | "sticky";

type Props = {
  mode?: "concept" | "job";
  focusedSection: FeedbackSectionId;
  focusedSectionLabel: string;
  visibleSectionIds: readonly FeedbackSectionId[];
  sectionLabels: Record<string, string>;
  activeTool: FeedbackTool;
  stickyColor: StickyNoteColorId;
  stickyDraft: string;
  stickyOpen: boolean;
  composerKind?: ComposerKind;
  erasing: boolean;
  recording: boolean;
  recordingSec: number;
  session: FeedbackSession;
  submitted: boolean;
  saveNotice: string | null;
  canSendRevision?: boolean;
  onStickyOpen: () => void;
  onStickyColor: (color: StickyNoteColorId) => void;
  onStickyDraft: (value: string) => void;
  onStickySave: () => void;
  onStickyCancel: () => void;
  onDrawToggle: () => void;
  onDrawPencil: () => void;
  onDrawErase: () => void;
  onDrawDone: () => void;
  onCompareToggle?: () => void;
  onCompareDone?: () => void;
  onHighlightToggle?: () => void;
  onHighlightDone?: () => void;
  onTextCommentToggle?: () => void;
  onTextCommentDone?: () => void;
  onVoiceToggle: () => void;
  onApprove: () => void;
  onRevision: () => void;
  onRequestChange?: () => void;
  onSendRevision?: () => void;
  onSkip?: () => void;
  onSubmit: () => void;
};

export default function FeedbackStudioFeedbackPanel({
  mode = "concept",
  focusedSection,
  focusedSectionLabel,
  visibleSectionIds,
  sectionLabels,
  activeTool,
  stickyColor,
  stickyDraft,
  stickyOpen,
  composerKind = "none",
  erasing,
  recording,
  recordingSec,
  session,
  submitted,
  saveNotice,
  canSendRevision = false,
  onStickyOpen,
  onStickyColor,
  onStickyDraft,
  onStickySave,
  onStickyCancel,
  onDrawToggle,
  onDrawPencil,
  onDrawErase,
  onDrawDone,
  onCompareToggle,
  onCompareDone,
  onHighlightToggle,
  onHighlightDone,
  onTextCommentToggle,
  onTextCommentDone,
  onVoiceToggle,
  onApprove,
  onRevision,
  onRequestChange,
  onSendRevision,
  onSkip,
  onSubmit,
}: Props) {
  const { feedbackPanel: copy, stickyNoteColors } = feedbackStudio;
  const phone = copy.phoneCustomerRevision;
  const sectionDecision = session.sectionStatuses[focusedSection] ?? "neutral";
  const revisionComposer = mode === "job" && stickyOpen && composerKind === "revision";
  const changeFieldRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!revisionComposer) return;
    changeFieldRef.current?.focus();
  }, [revisionComposer]);

  function renderAnnotateButtons() {
    return (
      <div className="fs-feedback-panel__group-actions">
        <button
          type="button"
          className={`fs-feedback-panel__btn fs-feedback-panel__btn--sticky${stickyOpen && composerKind === "sticky" ? " fs-feedback-panel__btn--active" : ""}`}
          onClick={onStickyOpen}
        >
          <span aria-hidden>📌</span> {copy.addStickyNote}
        </button>

        <button
          type="button"
          className={`fs-feedback-panel__btn fs-feedback-panel__btn--voice${recording ? " fs-feedback-panel__btn--active" : ""}`}
          onClick={onVoiceToggle}
        >
          <span aria-hidden>🎤</span>{" "}
          {recording ? `${copy.recording} (${recordingSec}s)` : copy.recordVoice}
        </button>

        <button
          type="button"
          className={`fs-feedback-panel__btn fs-feedback-panel__btn--draw${activeTool === "draw" ? " fs-feedback-panel__btn--active" : ""}`}
          onClick={onDrawToggle}
        >
          <span aria-hidden>✏</span> {copy.drawAnnotation}
        </button>

        {mode === "job" && onCompareToggle ? (
          <button
            type="button"
            className={`fs-feedback-panel__btn fs-feedback-panel__btn--compare${activeTool === "compare" ? " fs-feedback-panel__btn--active" : ""}`}
            onClick={onCompareToggle}
          >
            <span aria-hidden>⧉</span> {copy.versionCompare}
          </button>
        ) : null}

        {mode === "job" && onHighlightToggle ? (
          <button
            type="button"
            className={`fs-feedback-panel__btn fs-feedback-panel__btn--highlight${activeTool === "highlight" ? " fs-feedback-panel__btn--active" : ""}`}
            onClick={onHighlightToggle}
          >
            <span aria-hidden>▮</span> {copy.highlighter}
          </button>
        ) : null}
      </div>
    );
  }

  function renderStickyForm(options: { revision: boolean; fieldId?: string }) {
    if (!stickyOpen) return null;
    if (options.revision !== revisionComposer) return null;
    return (
      <div
        className={`fs-feedback-panel__sticky-form${options.revision ? " fs-feedback-panel__sticky-form--revision" : ""}`}
      >
        {options.revision || mode === "job" ? (
          <>
            <label className="fs-feedback-panel__change-label" htmlFor={options.fieldId}>
              {phone.changeLabel}
            </label>
            <p className="fs-feedback-panel__change-hint">{phone.stickyTapHint}</p>
          </>
        ) : (
          <div className="fs-feedback-panel__swatches fs-feedback-panel__swatches--pick" role="group" aria-label="Note color">
            {Object.values(stickyNoteColors).map((color) => (
              <button
                key={color.id}
                type="button"
                className={`fs-feedback-panel__swatch-btn fs-feedback-panel__swatch-btn--${color.id}${
                  stickyColor === color.id ? " fs-feedback-panel__swatch-btn--active" : ""
                }`}
                onClick={() => onStickyColor(color.id)}
                aria-pressed={stickyColor === color.id}
              >
                {color.label}
              </button>
            ))}
          </div>
        )}
        <textarea
          id={options.fieldId}
          ref={options.revision ? changeFieldRef : undefined}
          className="fs-feedback-panel__sticky-input"
          rows={4}
          value={stickyDraft}
          placeholder={options.revision ? phone.changePlaceholder : copy.stickyPlaceholder}
          onChange={(event) => onStickyDraft(event.target.value)}
        />
        {options.revision ? (
          <div className="fs-feedback-panel__sticky-actions">
            <button
              type="button"
              className="utility-btn utility-btn--secondary"
              onClick={onStickyCancel}
            >
              {phone.closeComposer}
            </button>
          </div>
        ) : (
          <div className="fs-feedback-panel__sticky-actions">
            <button type="button" className="utility-btn utility-btn--primary" onClick={onStickySave}>
              {copy.saveSticky}
            </button>
            <button type="button" className="utility-btn utility-btn--secondary" onClick={onStickyCancel}>
              {copy.cancelSticky}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      className={`fs-feedback-panel${mode === "job" ? " fs-feedback-panel--job" : ""}${revisionComposer ? " fs-feedback-panel--revision-composer" : ""}`}
      aria-label={mode === "job" ? phone.title : copy.title}
    >
      <div className="fs-feedback-panel__head fs-feedback-panel__head--desktop">
        <h2 className="fs-feedback-panel__title">{copy.title}</h2>
        <p className="fs-feedback-panel__hint">{copy.hint}</p>
        <p className="fs-feedback-panel__focus">
          {feedbackStudio.focusedSectionLabel}: <strong>{focusedSectionLabel}</strong>
        </p>
      </div>

      {mode === "job" ? (
        <div className="fs-feedback-panel__head fs-feedback-panel__head--phone">
          <h2 className="fs-feedback-panel__title">{phone.title}</h2>
          <p className="fs-feedback-panel__hint">{phone.hint}</p>
          <p className="fs-feedback-panel__focus">
            {feedbackStudio.focusedSectionLabel}: <strong>{focusedSectionLabel}</strong>
          </p>
        </div>
      ) : null}

      {submitted ? (
        <p className="fs-feedback-panel__submitted" role="status">
          {copy.submitted}
        </p>
      ) : saveNotice ? (
        <p className="fs-feedback-panel__saved" role="status" aria-live="polite">
          {saveNotice}
        </p>
      ) : null}

      {mode === "job" ? (
        <div className="fs-feedback-panel__phone-primary">
          <div className="fs-feedback-panel__group-actions">
            <button
              type="button"
              className={`fs-feedback-panel__btn fs-feedback-panel__btn--approve${sectionDecision === "approved" ? " fs-feedback-panel__btn--active" : ""}`}
              onClick={onApprove}
              aria-pressed={sectionDecision === "approved"}
            >
              {phone.looksGood}
            </button>
            <button
              type="button"
              className={`fs-feedback-panel__btn fs-feedback-panel__btn--revision${sectionDecision === "revision" ? " fs-feedback-panel__btn--active" : ""}`}
              onClick={onRequestChange ?? onRevision}
              aria-pressed={sectionDecision === "revision"}
            >
              {phone.requestChange}
            </button>
            {onSkip ? (
              <button
                type="button"
                className={`fs-feedback-panel__btn${sectionDecision === "skip" ? " fs-feedback-panel__btn--active" : ""}`}
                onClick={onSkip}
                aria-pressed={sectionDecision === "skip"}
              >
                {phone.skipForNow}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

        {mode === "job" && revisionComposer
          ? renderStickyForm({ revision: true, fieldId: "fs-phone-change-field" })
          : null}

      {mode === "job" && onSendRevision ? (
        <div className="fs-feedback-panel__phone-send">
          <button
            type="button"
            className="utility-btn utility-btn--primary fs-feedback-panel__send"
            disabled={submitted || !canSendRevision}
            onClick={onSendRevision}
          >
            {phone.sendRevision}
          </button>
          {!submitted && !canSendRevision && sectionDecision === "revision" ? (
            <p className="fs-feedback-panel__send-hint">{phone.sendNeedsChange}</p>
          ) : null}
        </div>
      ) : null}

      <div className="fs-feedback-panel__desktop-tools">
        <div className="fs-feedback-panel__group">
          <p className="fs-feedback-panel__group-title">{copy.toolGroups.annotate}</p>
          {renderAnnotateButtons()}
        </div>

        <div className="fs-feedback-panel__group">
          <p className="fs-feedback-panel__group-title">{copy.toolGroups.decide}</p>
          <div className="fs-feedback-panel__group-actions fs-feedback-panel__group-actions--pair">
            <button type="button" className="fs-feedback-panel__btn fs-feedback-panel__btn--approve" onClick={onApprove}>
              <span aria-hidden>✅</span> {copy.approveSection}
            </button>

            <button type="button" className="fs-feedback-panel__btn fs-feedback-panel__btn--revision" onClick={onRevision}>
              <span aria-hidden>🔄</span> {copy.requestRevision}
            </button>
            {onSkip ? (
              <button type="button" className="fs-feedback-panel__btn" onClick={onSkip}>
                <span aria-hidden>⏭</span> {copy.skipSection}
              </button>
            ) : null}
          </div>
        </div>

        {mode !== "job" || composerKind !== "revision"
          ? renderStickyForm({ revision: false })
          : null}
      </div>

      {mode === "job" ? (
        <details className="fs-feedback-panel__phone-more">
          <summary className="fs-feedback-panel__more-summary">{phone.moreTools}</summary>
          <p className="fs-feedback-panel__more-hint">{phone.moreToolsHint}</p>
          <div className="fs-feedback-panel__group">
            <p className="fs-feedback-panel__group-title">{copy.toolGroups.annotate}</p>
            {renderAnnotateButtons()}
          </div>
          {composerKind === "sticky" ? renderStickyForm({ revision: false }) : null}
        </details>
      ) : null}

      {activeTool === "draw" ? (
        <div className="fs-feedback-panel__draw-tools">
          <p className="fs-feedback-panel__draw-hint">{copy.drawActive}</p>
          <div className="fs-feedback-panel__draw-row">
            <button
              type="button"
              className={`fs-feedback-panel__draw-btn${!erasing ? " fs-feedback-panel__draw-btn--active" : ""}`}
              onClick={onDrawPencil}
            >
              ✏ Pencil
            </button>
            <button
              type="button"
              className={`fs-feedback-panel__draw-btn${erasing ? " fs-feedback-panel__draw-btn--active" : ""}`}
              onClick={onDrawErase}
            >
              {copy.drawErase}
            </button>
            <button type="button" className="fs-feedback-panel__draw-btn" onClick={onDrawDone}>
              {copy.drawDone}
            </button>
          </div>
        </div>
      ) : null}

      {mode === "job" && activeTool === "compare" && onCompareDone ? (
        <div className="fs-feedback-panel__draw-tools">
          <p className="fs-feedback-panel__draw-hint">{feedbackStudio.versionCompare.phoneLead}</p>
          <div className="fs-feedback-panel__draw-row">
            <button type="button" className="fs-feedback-panel__draw-btn" onClick={onCompareDone}>
              {feedbackStudio.versionCompare.closeCompare}
            </button>
          </div>
        </div>
      ) : null}

      {mode === "job" && activeTool === "highlight" && onHighlightDone ? (
        <div className="fs-feedback-panel__draw-tools">
          <p className="fs-feedback-panel__draw-hint">{feedbackStudio.highlighter.activeHint}</p>
          <div className="fs-feedback-panel__draw-row">
            <button type="button" className="fs-feedback-panel__draw-btn" onClick={onHighlightDone}>
              {feedbackStudio.highlighter.close}
            </button>
          </div>
        </div>
      ) : null}

      {mode === "job" && activeTool === "textComment" && onTextCommentDone ? (
        <div className="fs-feedback-panel__draw-tools">
          <p className="fs-feedback-panel__draw-hint">{feedbackStudio.textComment.activeHint}</p>
          <div className="fs-feedback-panel__draw-row">
            <button type="button" className="fs-feedback-panel__draw-btn" onClick={onTextCommentDone}>
              {feedbackStudio.textComment.close}
            </button>
          </div>
        </div>
      ) : null}

      <FeedbackActivityList
        stickyNotes={session.stickyNotes}
        voiceNotes={session.voiceNotes}
        sectionStatuses={session.sectionStatuses}
        visibleSectionIds={visibleSectionIds}
        sectionLabels={sectionLabels}
      />

      {mode === "concept" ? (
        <button
          type="button"
          className="utility-btn utility-btn--primary fs-feedback-panel__submit"
          onClick={onSubmit}
          disabled={submitted}
        >
          {copy.submitFeedback}
        </button>
      ) : null}
    </aside>
  );
}

function FeedbackActivityList({
  stickyNotes,
  voiceNotes,
  sectionStatuses,
  visibleSectionIds,
  sectionLabels,
}: {
  stickyNotes: FeedbackStickyNote[];
  voiceNotes: FeedbackVoiceNote[];
  sectionStatuses: Partial<Record<FeedbackSectionId, SectionReviewStatus>>;
  visibleSectionIds: readonly FeedbackSectionId[];
  sectionLabels: Record<string, string>;
}) {
  const { sectionStatus } = feedbackStudio;
  const scopedStickyNotes = stickyNotes.filter((note) => visibleSectionIds.includes(note.sectionId));
  const scopedVoiceNotes = voiceNotes.filter((note) => visibleSectionIds.includes(note.sectionId));
  const hasActivity =
    scopedStickyNotes.length > 0 ||
    scopedVoiceNotes.length > 0 ||
    visibleSectionIds.some((sectionId) => sectionStatuses[sectionId] !== "neutral" && sectionStatuses[sectionId]);

  if (!hasActivity) return null;

  return (
    <div className="fs-feedback-panel__activity">
      <p className="fs-feedback-panel__group-title">{feedbackStudio.feedbackPanel.toolGroups.log}</p>
      <ul className="fs-feedback-panel__activity-list">
        {visibleSectionIds.map((sectionId) => {
          const status = sectionStatuses[sectionId];
          if (!status || status === "neutral") return null;
          return (
            <li key={`status-${sectionId}`} className={`fs-activity-item fs-activity-item--${status}`}>
              {resolveFeedbackSectionLabel(sectionId, sectionLabels)} — {sectionStatus[status]}
            </li>
          );
        })}
        {scopedStickyNotes.map((note) => (
          <li key={note.id} className={`fs-activity-item fs-activity-item--sticky fs-activity-item--${note.color}`}>
            {resolveFeedbackSectionLabel(note.sectionId, sectionLabels)}: {note.text}
          </li>
        ))}
        {scopedVoiceNotes.map((note) => (
          <li key={note.id} className="fs-activity-item fs-activity-item--voice">
            {resolveFeedbackSectionLabel(note.sectionId, sectionLabels)} — voice ({note.durationSec}s)
          </li>
        ))}
      </ul>
    </div>
  );
}
