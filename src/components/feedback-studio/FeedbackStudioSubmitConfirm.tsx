"use client";

import { c8bReviewHandoffReceiptsV1 } from "@/config/c8b-review-handoff-receipts-v1";
import { feedbackStudio } from "@/config/feedback-studio";
import type { FeedbackPackageInventory } from "@/lib/job-control/review-handoff-receipts";
import type {
  ApprovalConfirmScope,
  PhoneRevisionConfirmSummary,
} from "@/lib/studio-review-revision/phone-revision-composer";

type Mode = "revision" | "approval";

type Props = {
  mode: Mode;
  inventory: FeedbackPackageInventory;
  versionLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  surface?: "desktop" | "phone";
  phoneSummary?: PhoneRevisionConfirmSummary | null;
  approvalScope?: ApprovalConfirmScope | null;
};

/** C8b — pre-submit confirmation summary before formal revision or approval. */
export default function FeedbackStudioSubmitConfirm({
  mode,
  inventory,
  versionLabel,
  busy,
  onConfirm,
  onCancel,
  surface = "desktop",
  phoneSummary = null,
  approvalScope = null,
}: Props) {
  const approvalCopy = c8bReviewHandoffReceiptsV1.confirmApproval;
  const phoneCopy = feedbackStudio.feedbackPanel.phoneCustomerRevision;
  const copy =
    mode === "revision"
      ? c8bReviewHandoffReceiptsV1.confirmRevision
      : c8bReviewHandoffReceiptsV1.confirmApproval;
  const inventoryCopy = c8bReviewHandoffReceiptsV1.inventory;
  const phoneRevision = mode === "revision" && surface === "phone";
  const title = phoneRevision ? phoneCopy.confirmTitle : copy.title;
  const lead = phoneRevision
    ? phoneCopy.confirmLead(versionLabel)
    : copy.lead(versionLabel);
  const cancelCta = phoneRevision ? phoneCopy.confirmCancel : copy.cancelCta;
  const confirmCta = phoneRevision ? phoneCopy.confirmSend : copy.confirmCta;

  return (
    <div
      className="fs-submit-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fs-submit-confirm-title"
    >
      <div className="fs-submit-confirm__panel">
        <h2 id="fs-submit-confirm-title" className="fs-submit-confirm__title">
          {title}
        </h2>
        <p className="fs-submit-confirm__lead">{lead}</p>
        {phoneRevision ? (
          <>
            {phoneSummary?.requestText ? (
              <>
                <p className="fs-submit-confirm__request-label">{phoneCopy.confirmRequestLabel}</p>
                <p className="fs-submit-confirm__request">{phoneSummary.requestText}</p>
              </>
            ) : null}
            {phoneSummary?.hasDrawing || phoneSummary?.hasVoice ? (
              <ul className="fs-submit-confirm__attachments">
                {phoneSummary.hasDrawing ? (
                  <li>{phoneCopy.confirmDrawingAttachment}</li>
                ) : null}
                {phoneSummary.hasVoice ? (
                  <li>{phoneCopy.confirmVoiceAttachment}</li>
                ) : null}
              </ul>
            ) : null}
          </>
        ) : (
          <>
            <dl className="fs-receipt__list">
              {mode === "approval" && approvalScope ? (
                <div className="fs-receipt__row">
                  <dt>{approvalCopy.packageLabel}</dt>
                  <dd>{approvalScope.packageName}</dd>
                </div>
              ) : null}
              <div className="fs-receipt__row">
                <dt>Version</dt>
                <dd>{versionLabel}</dd>
              </div>
              <div className="fs-receipt__row">
                <dt>Action</dt>
                <dd>{copy.actionLabel}</dd>
              </div>
            </dl>
            {mode === "approval" && approvalScope && approvalScope.items.length > 0 ? (
              <>
                <p className="fs-submit-confirm__request-label">{approvalCopy.itemsLabel}</p>
                <ul className="fs-receipt__inventory" aria-label={approvalCopy.itemsLabel}>
                  {approvalScope.items.map((item, index) => (
                    <li key={`${index}-${item}`}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
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
          </>
        )}
        <div className="fs-submit-confirm__actions">
          <button
            type="button"
            className="utility-btn utility-btn--secondary"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelCta}
          </button>
          <button
            type="button"
            className="utility-btn utility-btn--primary"
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmCta}
          </button>
        </div>
      </div>
    </div>
  );
}
