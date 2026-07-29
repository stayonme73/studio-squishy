"use client";

import { c8bReviewHandoffReceiptsV1 } from "@/config/c8b-review-handoff-receipts-v1";
import type { StudioSubmissionReceipt } from "@/lib/job-control/review-handoff-receipts";

type Props = {
  receipt: StudioSubmissionReceipt;
};

/** C8b — customer-visible Studio → customer submission receipt. */
export default function FeedbackStudioSubmissionReceipt({ receipt }: Props) {
  const copy = c8bReviewHandoffReceiptsV1.submissionReceipt;

  return (
    <section
      className="fs-receipt fs-receipt--submission"
      aria-label={copy.label}
    >
      <h2 className="fs-receipt__title">{copy.label}</h2>
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
          <dt>Submitted</dt>
          <dd>{receipt.submittedAtLabel}</dd>
        </div>
        <div className="fs-receipt__row">
          <dt>From</dt>
          <dd>{receipt.submittedByLabel}</dd>
        </div>
        <div className="fs-receipt__row">
          <dt>Action required</dt>
          <dd>{receipt.actionRequired}</dd>
        </div>
      </dl>
    </section>
  );
}
