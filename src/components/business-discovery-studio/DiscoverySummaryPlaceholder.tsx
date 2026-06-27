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
      className="bds-summary-panel bds-summary-panel--proposal"
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
              <li key={service.name} className="bds-summary-panel__service-row">
                <span>✅ {service.name}</span>
                <p className="bds-summary-panel__service-why">
                  <span className="bds-summary-panel__subtitle">
                    {PROJECT_SUMMARY_LABELS.recommendWhyLabel}
                  </span>{" "}
                  {service.why}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bds-summary-panel__section" aria-labelledby="bds-summary-packages-title">
          <h2 id="bds-summary-packages-title" className="bds-summary-panel__title">
            {PROJECT_SUMMARY_LABELS.packagesTitle}
          </h2>
          <p className="bds-summary-panel__body">{PROJECT_SUMMARY_LABELS.packagesLead}</p>
          <ul className="bds-summary-panel__packages">
            {PROJECT_SUMMARY_MOCK.packages.map((pkg) => (
              <li key={pkg.id} className="bds-summary-panel__package-card">
                <p className="bds-summary-panel__package-name">{pkg.name}</p>
                <p className="bds-summary-panel__body">{pkg.tagline}</p>
                <p className="bds-summary-panel__package-price">{pkg.priceLabel}</p>
              </li>
            ))}
          </ul>
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

        <section className="bds-summary-panel__section" aria-labelledby="bds-summary-disclaimer-title">
          <h2 id="bds-summary-disclaimer-title" className="bds-summary-panel__subtitle">
            {PROJECT_SUMMARY_LABELS.disclaimerTitle}
          </h2>
          <p className="bds-summary-panel__body">{PROJECT_SUMMARY_LABELS.disclaimerBody}</p>
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
