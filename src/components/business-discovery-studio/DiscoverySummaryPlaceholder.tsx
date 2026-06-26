"use client";

import {
  PROJECT_SUMMARY_LABELS,
  PROJECT_SUMMARY_MOCK,
} from "@/project-summary";

type Props = {
  onContinue: () => void;
};

/** Project Summary shell in split panel — mock recommendation structure until Discovery Mapping is wired. */
export default function DiscoverySummaryPlaceholder({ onContinue }: Props) {
  return (
    <aside
      className="bds-summary-panel"
      aria-labelledby="bds-summary-recommend-title"
      aria-describedby="bds-summary-customize-lead"
    >
      <div className="bds-summary-panel__inner">
        <p className="bds-summary-panel__eyebrow">Your Studio Plan</p>

        <section className="bds-summary-panel__section" aria-labelledby="bds-summary-recommend-title">
          <h2 id="bds-summary-recommend-title" className="bds-summary-panel__title">
            {PROJECT_SUMMARY_LABELS.recommendTitle}
          </h2>
          <p className="bds-summary-panel__body">{PROJECT_SUMMARY_LABELS.recommendLead}</p>
          <ul className="bds-summary-panel__service-list">
            {PROJECT_SUMMARY_MOCK.services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
          <h3 className="bds-summary-panel__subtitle">{PROJECT_SUMMARY_LABELS.recommendWhyLabel}</h3>
          <p className="bds-summary-panel__body">{PROJECT_SUMMARY_MOCK.whyRationale}</p>
        </section>

        <section className="bds-summary-panel__section" aria-labelledby="bds-summary-customize-title">
          <h2 id="bds-summary-customize-title" className="bds-summary-panel__title">
            {PROJECT_SUMMARY_LABELS.changesTitle}
          </h2>
          <p id="bds-summary-customize-lead" className="bds-summary-panel__body">
            {PROJECT_SUMMARY_LABELS.changesLead}
          </p>
          <p className="bds-summary-panel__body">{PROJECT_SUMMARY_LABELS.changesPowersIntro}</p>
          <ul className="bds-summary-panel__powers-list">
            {PROJECT_SUMMARY_LABELS.changesPowers.map((power) => (
              <li key={power}>{power}</li>
            ))}
          </ul>
          <p className="bds-summary-panel__body">{PROJECT_SUMMARY_LABELS.changesAutoUpdate}</p>
        </section>

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
