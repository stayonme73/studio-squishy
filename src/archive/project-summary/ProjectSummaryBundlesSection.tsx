/**
 * Archived — Studio Bundles section (Spark / Momentum / Growth).
 * Hidden from active Project Summary until bundle data is rebuilt.
 * @see docs/studio-bundles-v1-locked.md
 */

import { PROJECT_SUMMARY_LABELS, PROJECT_SUMMARY_MOCK_PACKAGES } from "@/project-summary";

/** Prefer a bundled option? — archived mock bundle cards. */
export default function ProjectSummaryBundlesSection() {
  return (
    <section
      className="utility-card ps-section"
      aria-labelledby="ps-packages-title"
    >
      <h2 id="ps-packages-title" className="utility-card__title">
        {PROJECT_SUMMARY_LABELS.packagesTitle}
      </h2>
      <p className="ps-packages__lead">{PROJECT_SUMMARY_LABELS.packagesLead}</p>
      <ul className="ps-packages__grid" aria-label={PROJECT_SUMMARY_LABELS.packagesSelectLabel}>
        {PROJECT_SUMMARY_MOCK_PACKAGES.map((pkg) => (
          <li key={pkg.id} className="ps-packages__card">
            <div className="ps-packages__intro">
              <p className="ps-packages__name">
                <span aria-hidden="true">{pkg.emoji} </span>
                {pkg.name}
              </p>
              <p className="ps-packages__tagline">{pkg.tagline}</p>
              <p className="ps-packages__description">{pkg.description}</p>
            </div>
            <div className="ps-packages__includes-block">
              <p className="ps-packages__includes-label">
                {PROJECT_SUMMARY_LABELS.packagesIncludesLabel}
              </p>
              <ul className="ps-packages__includes">
                {pkg.includes.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </div>
            <p className="ps-packages__price">{pkg.priceDisplay}</p>
            <p className="ps-packages__billing">{pkg.billingLabel}</p>
            <button type="button" className="utility-btn utility-btn--secondary ps-packages__select" disabled>
              {PROJECT_SUMMARY_LABELS.packagesSelectLabel}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
