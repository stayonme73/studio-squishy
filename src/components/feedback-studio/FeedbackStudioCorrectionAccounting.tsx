"use client";

import { feedbackStudio } from "@/config/feedback-studio";
import type { CorrectionAccountingView } from "@/lib/job-control/correction-round-ledger";

type Props = {
  accounting: CorrectionAccountingView;
  exhaustedWording: string | null;
};

/** C8c — included / used / remaining + correction-use history in REVIEW TOOLS rail. */
export default function FeedbackStudioCorrectionAccounting({
  accounting,
  exhaustedWording,
}: Props) {
  const copy = feedbackStudio.correctionAccounting;

  return (
    <section
      className="fs-status-card fs-correction-accounting"
      aria-label={copy.label}
    >
      <span className="fs-status-card__label">{copy.label}</span>
      <dl className="fs-correction-accounting__counts">
        <div>
          <dt>{copy.included}</dt>
          <dd>{accounting.included}</dd>
        </div>
        <div>
          <dt>{copy.used}</dt>
          <dd>{accounting.effectiveUsed}</dd>
        </div>
        <div>
          <dt>{copy.remaining}</dt>
          <dd>{accounting.remaining}</dd>
        </div>
        {accounting.extraGranted > 0 ? (
          <div>
            <dt>{copy.extraRemaining}</dt>
            <dd>{accounting.extraRemaining}</dd>
          </div>
        ) : null}
      </dl>

      {exhaustedWording ? (
        <p className="fs-correction-accounting__exhausted" role="status">
          {exhaustedWording}
        </p>
      ) : null}

      {accounting.history.length > 0 ? (
        <ul className="fs-correction-accounting__history">
          {accounting.history.map((row) => (
            <li key={row.id}>
              <strong>
                {copy.historyItem(row.ordinal, accounting.included)}
              </strong>
              <span>
                {row.versionLabel?.trim() || copy.versionFallback} ·{" "}
                {new Date(row.submittedAt).toLocaleString()}
              </span>
              <span>
                {row.consumptionKind === "owner_extra"
                  ? copy.ownerExtraUse
                  : copy.includedUse}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {accounting.provisionalLegacyUsed > 0 ? (
        <p className="fs-correction-accounting__legacy">{copy.legacyNotice}</p>
      ) : null}
    </section>
  );
}
