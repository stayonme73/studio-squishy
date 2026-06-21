"use client";

import type {
  FeedbackSectionId,
  FeedbackSession,
  FeedbackStickyNote,
  FeedbackTool,
  FeedbackVoiceNote,
  SectionReviewStatus,
  StickyNoteColorId,
} from "@/config/feedback-studio";
import { FEEDBACK_SECTION_IDS, feedbackStudio } from "@/config/feedback-studio";

type Props = {
  focusedSection: FeedbackSectionId;
  focusedSectionLabel: string;
  activeTool: FeedbackTool;
  stickyColor: StickyNoteColorId;
  stickyDraft: string;
  stickyOpen: boolean;
  erasing: boolean;
  recording: boolean;
  recordingSec: number;
  session: FeedbackSession;
  submitted: boolean;
  saveNotice: string | null;
  onStickyOpen: () => void;
  onStickyColor: (color: StickyNoteColorId) => void;
  onStickyDraft: (value: string) => void;
  onStickySave: () => void;
  onStickyCancel: () => void;
  onDrawToggle: () => void;
  onDrawPencil: () => void;
  onDrawErase: () => void;
  onDrawDone: () => void;
  onVoiceToggle: () => void;
  onApprove: () => void;
  onRevision: () => void;
  onSubmit: () => void;
};

export default function FeedbackStudioFeedbackPanel({
  focusedSectionLabel,
  activeTool,
  stickyColor,
  stickyDraft,
  stickyOpen,
  erasing,
  recording,
  recordingSec,
  session,
  submitted,
  saveNotice,
  onStickyOpen,
  onStickyColor,
  onStickyDraft,
  onStickySave,
  onStickyCancel,
  onDrawToggle,
  onDrawPencil,
  onDrawErase,
  onDrawDone,
  onVoiceToggle,
  onApprove,
  onRevision,
  onSubmit,
}: Props) {
  const { feedbackPanel: copy, stickyNoteColors } = feedbackStudio;

  return (
    <aside className="fs-feedback-panel" aria-label={copy.title}>
      <div className="fs-feedback-panel__head">
        <h2 className="fs-feedback-panel__title">{copy.title}</h2>
        <p className="fs-feedback-panel__hint">{copy.hint}</p>
        <p className="fs-feedback-panel__focus">
          {feedbackStudio.focusedSectionLabel}: <strong>{focusedSectionLabel}</strong>
        </p>
      </div>

      {submitted ? (
        <p className="fs-feedback-panel__submitted" role="status">
          {copy.submitted}
        </p>
      ) : saveNotice ? (
        <p className="fs-feedback-panel__saved" role="status" aria-live="polite">
          {saveNotice}
        </p>
      ) : null}

      <div className="fs-feedback-panel__group">
        <p className="fs-feedback-panel__group-title">{copy.toolGroups.annotate}</p>
        <div className="fs-feedback-panel__group-actions">
          <button
            type="button"
            className={`fs-feedback-panel__btn${stickyOpen ? " fs-feedback-panel__btn--active" : ""}`}
            onClick={onStickyOpen}
          >
            <span aria-hidden>📌</span> {copy.addStickyNote}
          </button>

          <button
            type="button"
            className={`fs-feedback-panel__btn${recording ? " fs-feedback-panel__btn--active" : ""}`}
            onClick={onVoiceToggle}
          >
            <span aria-hidden>🎤</span>{" "}
            {recording ? `${copy.recording} (${recordingSec}s)` : copy.recordVoice}
          </button>

          <button
            type="button"
            className={`fs-feedback-panel__btn${activeTool === "draw" ? " fs-feedback-panel__btn--active" : ""}`}
            onClick={onDrawToggle}
          >
            <span aria-hidden>✏</span> {copy.drawAnnotation}
          </button>
        </div>
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
        </div>
      </div>

      {stickyOpen ? (
        <div className="fs-feedback-panel__sticky-form">
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
          <textarea
            className="fs-feedback-panel__sticky-input"
            rows={3}
            value={stickyDraft}
            placeholder={copy.stickyPlaceholder}
            onChange={(event) => onStickyDraft(event.target.value)}
          />
          <div className="fs-feedback-panel__sticky-actions">
            <button type="button" className="utility-btn utility-btn--primary" onClick={onStickySave}>
              {copy.saveSticky}
            </button>
            <button type="button" className="utility-btn utility-btn--secondary" onClick={onStickyCancel}>
              {copy.cancelSticky}
            </button>
          </div>
        </div>
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

      <FeedbackActivityList
        stickyNotes={session.stickyNotes}
        voiceNotes={session.voiceNotes}
        sectionStatuses={session.sectionStatuses}
      />

      <button
        type="button"
        className="utility-btn utility-btn--primary fs-feedback-panel__submit"
        onClick={onSubmit}
        disabled={submitted}
      >
        {copy.submitFeedback}
      </button>
    </aside>
  );
}

function FeedbackActivityList({
  stickyNotes,
  voiceNotes,
  sectionStatuses,
}: {
  stickyNotes: FeedbackStickyNote[];
  voiceNotes: FeedbackVoiceNote[];
  sectionStatuses: Record<FeedbackSectionId, SectionReviewStatus>;
}) {
  const { previewSections, sectionStatus } = feedbackStudio;
  const hasActivity =
    stickyNotes.length > 0 || voiceNotes.length > 0 || Object.values(sectionStatuses).some((s) => s !== "neutral");

  if (!hasActivity) return null;

  return (
    <div className="fs-feedback-panel__activity">
      <p className="fs-feedback-panel__group-title">{feedbackStudio.feedbackPanel.toolGroups.log}</p>
      <ul className="fs-feedback-panel__activity-list">
        {FEEDBACK_SECTION_IDS.map((sectionId) => {
          const status = sectionStatuses[sectionId];
          if (status === "neutral") return null;
          return (
            <li key={`status-${sectionId}`} className={`fs-activity-item fs-activity-item--${status}`}>
              {previewSections[sectionId]} — {sectionStatus[status]}
            </li>
          );
        })}
        {stickyNotes.map((note) => (
          <li key={note.id} className={`fs-activity-item fs-activity-item--sticky fs-activity-item--${note.color}`}>
            {previewSections[note.sectionId]}: {note.text}
          </li>
        ))}
        {voiceNotes.map((note) => (
          <li key={note.id} className="fs-activity-item fs-activity-item--voice">
            {previewSections[note.sectionId]} — voice ({note.durationSec}s)
          </li>
        ))}
      </ul>
    </div>
  );
}
