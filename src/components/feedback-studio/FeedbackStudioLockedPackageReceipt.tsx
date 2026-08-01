"use client";

import { c8bReviewHandoffReceiptsV1 } from "@/config/c8b-review-handoff-receipts-v1";
import type { LockedFeedbackPackageReceipt } from "@/lib/job-control/review-handoff-receipts";

type Props = {
  receipt: LockedFeedbackPackageReceipt;
};

/** C8b — immutable receipt for a formally submitted feedback package. */
export default function FeedbackStudioLockedPackageReceipt({ receipt }: Props) {
  const copy = c8bReviewHandoffReceiptsV1;
  const { inventory } = receipt;

  return (
    <section
      className="fs-receipt fs-receipt--locked"
      aria-label={receipt.title}
    >
      <h2 className="fs-receipt__title">{receipt.title}</h2>
      <p className="fs-receipt__notice">{copy.lockedPackage.immutableNotice}</p>
      <dl className="fs-receipt__list">
        <div className="fs-receipt__row">
          <dt>Status</dt>
          <dd>{receipt.statusLabel}</dd>
        </div>
        <div className="fs-receipt__row">
          <dt>Version</dt>
          <dd>{receipt.versionLabel}</dd>
        </div>
        <div className="fs-receipt__row">
          <dt>Submitted by</dt>
          <dd>{receipt.submittedByLabel}</dd>
        </div>
        <div className="fs-receipt__row">
          <dt>Submitted</dt>
          <dd>{receipt.submittedAtLabel}</dd>
        </div>
        <div className="fs-receipt__row">
          <dt>Submission type</dt>
          <dd>{receipt.submissionTypeLabel}</dd>
        </div>
      </dl>
      <ul className="fs-receipt__inventory">
        <li>{copy.inventory.stickyNotes(inventory.stickyNoteCount)}</li>
        <li>{copy.inventory.drawings(inventory.drawingSectionCount)}</li>
        <li>{copy.inventory.voiceNotes(inventory.voiceNoteCount)}</li>
        <li>{copy.inventory.writtenComments(inventory.writtenCommentCount)}</li>
        <li>
          {copy.inventory.sectionDecisions(inventory.sectionDecisions.length)}
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
    </section>
  );
}
