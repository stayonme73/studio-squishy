"use client";

import { useRef } from "react";

import SamsungDenimCta from "@/components/studio-conversation-room/guide/SamsungDenimCta";
import type { FeedbackTool } from "@/config/feedback-studio";
import { feedbackStudio } from "@/config/feedback-studio";

type Props = {
  submitted: boolean;
  busy: boolean;
  canSendRevision: boolean;
  canOfferChange: boolean;
  revisionWorking: boolean;
  changeOpen: boolean;
  askOpen: boolean;
  stickyDraft: string;
  activeTool: FeedbackTool;
  recording: boolean;
  recordingSec: number;
  hasDrawnMarks: boolean;
  onApprove: () => void;
  onRequestChange: () => void;
  onAskStudio: () => void;
  onStickyDraft: (value: string) => void;
  onSendRevision: () => void;
  onDrawToggle: () => void;
  onVoiceToggle: () => void;
  onErase: () => void;
};

/** Phone-only decision dock — lives beside the proof, not in the audit rail. */
export default function JobReviewPhoneCustomerDock({
  submitted,
  busy,
  canSendRevision,
  canOfferChange,
  revisionWorking,
  changeOpen,
  askOpen,
  stickyDraft,
  activeTool,
  recording,
  recordingSec,
  hasDrawnMarks,
  onApprove,
  onRequestChange,
  onAskStudio,
  onStickyDraft,
  onSendRevision,
  onDrawToggle,
  onVoiceToggle,
  onErase,
}: Props) {
  const copy = feedbackStudio.feedbackPanel.phoneCustomerRevision;
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  const showChangePanel = canOfferChange && changeOpen && !revisionWorking;
  const drawActive = showChangePanel && activeTool === "draw";
  const hasTyped = stickyDraft.trim().length > 0;
  const toolHint = drawActive
    ? copy.drawHint
    : activeTool === "voice" || recording
      ? copy.voiceHint
      : copy.optionalToolsHint;

  return (
    <section className="fs-phone-dock" aria-label="Review actions">
      {revisionWorking ? (
        <div className="fs-phone-dock__status" role="status">
          <p className="fs-phone-dock__label">{copy.revisionRequested}</p>
          <p className="fs-phone-dock__hint">{copy.revisionWorking}</p>
        </div>
      ) : null}

      <div className="fs-phone-dock__actions">
        {revisionWorking ? null : (
          <SamsungDenimCta
            className="lobby-entry-film__cta fs-phone-dock__btn fs-phone-dock__btn--approve"
            disabled={busy || submitted}
            onActivate={onApprove}
          >
            {copy.approve}
          </SamsungDenimCta>
        )}
        {canOfferChange && !revisionWorking ? (
          <button
            type="button"
            className={`utility-btn fs-phone-dock__btn fs-phone-dock__btn--change${showChangePanel ? " fs-phone-dock__btn--selected" : ""}`}
            disabled={busy || submitted}
            aria-pressed={showChangePanel}
            onClick={onRequestChange}
          >
            {copy.requestChange}
          </button>
        ) : null}
        <button
          type="button"
          className={`utility-btn fs-phone-dock__btn fs-phone-dock__btn--ask${askOpen ? " fs-phone-dock__btn--selected" : ""}`}
          disabled={busy}
          aria-pressed={askOpen}
          onClick={onAskStudio}
        >
          {copy.askStudio}
        </button>
      </div>

      {showChangePanel ? (
        <div className="fs-phone-dock__change">
          <p className="fs-phone-dock__label">{copy.changeLabel}</p>
          <textarea
            id="fs-phone-dock-change-field"
            ref={fieldRef}
            className={`fs-phone-dock__field${hasTyped ? " fs-phone-dock__field--typed" : ""}`}
            rows={4}
            value={stickyDraft}
            placeholder={copy.changePlaceholder}
            onChange={(event) => onStickyDraft(event.target.value)}
          />

          <p className="fs-phone-dock__optional-label">{copy.optionalToolsLabel}</p>
          <div className="fs-phone-dock__tools" role="group" aria-label="Change tools">
            <button
              type="button"
              className={`fs-feedback-panel__btn${drawActive ? " fs-feedback-panel__btn--active" : ""}`}
              aria-pressed={drawActive}
              onClick={onDrawToggle}
            >
              {copy.drawTool}
            </button>
            <button
              type="button"
              className={`fs-feedback-panel__btn${recording || activeTool === "voice" ? " fs-feedback-panel__btn--active" : ""}`}
              onClick={onVoiceToggle}
            >
              {recording ? `${feedbackStudio.feedbackPanel.recording} (${recordingSec}s)` : copy.voiceTool}
            </button>
          </div>
          {hasDrawnMarks ? (
            <button
              type="button"
              className="fs-feedback-panel__btn fs-phone-dock__erase"
              onClick={onErase}
            >
              {copy.erase}
            </button>
          ) : null}
          <p className="fs-phone-dock__hint">{toolHint}</p>
          <p className="fs-phone-dock__hint">{copy.changeHint}</p>

          <button
            type="button"
            className="utility-btn fs-phone-dock__send"
            disabled={busy || submitted || !canSendRevision}
            onClick={onSendRevision}
          >
            {copy.sendRevision}
          </button>
          {!submitted && !canSendRevision ? (
            <p className="fs-phone-dock__hint">{copy.sendNeedsChange}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
