"use client";

import { feedbackStudio } from "@/config/feedback-studio";
import type { VersionCompareProof } from "@/lib/job-control/version-compare";
import { resolveVersionCompareSelection } from "@/lib/job-control/version-compare";

type Props = {
  proofFiles: readonly VersionCompareProof[];
  currentId: string | null;
  priorId: string | null;
  onSelectCurrent: (id: string) => void;
  onSelectPrior: (id: string) => void;
};

function formatProofDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProofPane({
  roleLabel,
  proof,
  options,
  selectId,
  onSelect,
  selectLabel,
}: {
  roleLabel: string;
  proof: VersionCompareProof;
  options: readonly VersionCompareProof[];
  selectId: string;
  onSelect: (id: string) => void;
  selectLabel: string;
}) {
  return (
    <article className="fs-version-compare__pane">
      <header className="fs-version-compare__pane-head">
        <p className="fs-version-compare__role">{roleLabel}</p>
        <label className="fs-version-compare__select-label">
          <select
            className="fs-version-compare__select"
            value={selectId}
            onChange={(event) => onSelect(event.target.value)}
            aria-label={selectLabel}
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.versionLabel} · {option.filename}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="fs-version-compare__body">
            {proof.accessHref ? (
              <img
                src={proof.accessHref}
                alt={proof.versionLabel}
                className="fs-review-proof__image"
              />
            ) : null}
            <p className="fs-version-compare__filename">
          {proof.accessHref ? (
            <a href={proof.accessHref} target="_blank" rel="noreferrer">
              {proof.filename}
            </a>
          ) : (
            <span>{proof.filename}</span>
          )}
        </p>
        <p className="fs-version-compare__meta">
          {proof.versionLabel} · {proof.fileType}
        </p>
        <p className="fs-version-compare__meta">
          {feedbackStudio.versionCompare.recordedLabel} {formatProofDate(proof.addedAt)}
        </p>
      </div>
    </article>
  );
}

export default function JobReviewVersionCompare({
  proofFiles,
  currentId,
  priorId,
  onSelectCurrent,
  onSelectPrior,
}: Props) {
  const copy = feedbackStudio.versionCompare;
  const selection = resolveVersionCompareSelection(proofFiles, currentId, priorId);

  if (selection.status === "unavailable") {
    return (
      <div className="fs-version-compare fs-version-compare--unavailable" role="status">
        <p className="fs-version-compare__title">{copy.title}</p>
        <p className="fs-version-compare__unavailable">{copy.unavailable}</p>
      </div>
    );
  }

  return (
    <div className="fs-version-compare" aria-label={copy.title}>
      <p className="fs-version-compare__title">{copy.title}</p>
      <p className="fs-version-compare__lead">{copy.lead}</p>
      <div className="fs-version-compare__panes">
        <ProofPane
          roleLabel={copy.priorLabel}
          proof={selection.prior}
          options={selection.options}
          selectId={selection.prior.id}
          onSelect={onSelectPrior}
          selectLabel={copy.selectPrior}
        />
        <ProofPane
          roleLabel={copy.currentLabel}
          proof={selection.current}
          options={selection.options}
          selectId={selection.current.id}
          onSelect={onSelectCurrent}
          selectLabel={copy.selectCurrent}
        />
      </div>
      <p className="fs-version-compare__note">{copy.noDiffNote}</p>
    </div>
  );
}
