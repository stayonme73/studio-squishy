"use client";

import { c8bReviewHandoffReceiptsV1 } from "@/config/c8b-review-handoff-receipts-v1";
import type { FeedbackPackageInventory } from "@/lib/job-control/review-handoff-receipts";

type Mode = "revision" | "approval";

type Props = {
  mode: Mode;
  inventory: FeedbackPackageInventory;
  versionLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** C8b — pre-submit confirmation summary before formal revision or approval. */
export default function FeedbackStudioSubmitConfirm({
  mode,
  inventory,
  versionLabel,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  const copy =
    mode === "revision"
      ? c8bReviewHandoffReceiptsV1.confirmRevision
      : c8bReviewHandoffReceiptsV1.confirmApproval;
  const inventoryCopy = c8bReviewHandoffReceiptsV1.inventory;

  return (
    <div
      className="fs-submit-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fs-submit-confirm-title"
    >
      <div className="fs-submit-confirm__panel">
        <h2 id="fs-submit-confirm-title" className="fs-submit-confirm__title">
          {copy.title}
        </h2>
        <p className="fs-submit-confirm__lead">{copy.lead(versionLabel)}</p>
        <dl className="fs-receipt__list">
          <div className="fs-receipt__row">
            <dt>Version</dt>
            <dd>{versionLabel}</dd>
          </div>
          <div className="fs-receipt__row">
            <dt>Action</dt>
            <dd>{copy.actionLabel}</dd>
          </div>
        </dl>
        {mode === "revision" ? (
          <>
            <ul className="fs-receipt__inventory">
              <li>{inventoryCopy.stickyNotes(inventory.stickyNoteCount)}</li>
              <li>{inventoryCopy.drawings(inventory.drawingSectionCount)}</li>
              <li>{inventoryCopy.voiceNotes(inventory.voiceNoteCount)}</li>
              <li>{inventoryCopy.writtenComments(inventory.writtenCommentCount)}</li>
              <li>
                {inventoryCopy.sectionDecisions(inventory.sectionDecisions.length)}
              </li>
            </ul>
            {inventory.stickyNoteTexts.length > 0 ? (
              <ul className="fs-receipt__notes">
                {inventory.stickyNoteTexts.map((text, index) => (
                  <li key={`${index}-${text.slice(0, 24)}`}>{text}</li>
                ))}
              </ul>
            ) : null}
            {inventory.writtenCommentTexts.length > 0 ? (
              <ul className="fs-receipt__notes" aria-label="Written comments">
                {inventory.writtenCommentTexts.map((text, index) => (
                  <li key={`wc-${index}-${text.slice(0, 24)}`}>{text}</li>
                ))}
              </ul>
            ) : null}
            {inventory.isEmpty ? (
              <p className="fs-submit-confirm__empty" role="status">
                {c8bReviewHandoffReceiptsV1.confirmRevision.emptyNotice}
              </p>
            ) : null}
          </>
        ) : null}
        <div className="fs-submit-confirm__actions">
          <button
            type="button"
            className="utility-btn utility-btn--secondary"
            disabled={busy}
            onClick={onCancel}
          >
            {copy.cancelCta}
          </button>
          <button
            type="button"
            className="utility-btn utility-btn--primary"
            disabled={busy}
            onClick={onConfirm}
          >
            {copy.confirmCta}
          </button>
        </div>
      </div>
    </div>
  );
}
