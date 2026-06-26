"use client";

type Props = {
  onContinue: () => void;
};

/** Minimal Studio Plan shell — full recommendation content comes in a later milestone. */
export default function DiscoverySummaryPlaceholder({ onContinue }: Props) {
  return (
    <aside
      className="bds-summary-panel"
      aria-labelledby="bds-summary-title"
      aria-describedby="bds-summary-body"
    >
      <div className="bds-summary-panel__inner">
        <p className="bds-summary-panel__eyebrow">Your Studio Plan</p>
        <h2 id="bds-summary-title" className="bds-summary-panel__title">
          Project Summary
        </h2>
        <p id="bds-summary-body" className="bds-summary-panel__body">
          We&apos;ve reviewed your discovery answers. Your personalized Studio Plan and service
          recommendations will appear here.
        </p>
        <div className="bds-summary-panel__placeholder" aria-hidden="true">
          <div className="bds-summary-panel__placeholder-line bds-summary-panel__placeholder-line--wide" />
          <div className="bds-summary-panel__placeholder-line" />
          <div className="bds-summary-panel__placeholder-line" />
          <div className="bds-summary-panel__placeholder-line bds-summary-panel__placeholder-line--short" />
        </div>
        <button
          type="button"
          className="bds-sheet__btn bds-sheet__btn--primary bds-summary-panel__continue"
          onClick={onContinue}
        >
          Continue to Project Summary
        </button>
      </div>
    </aside>
  );
}
