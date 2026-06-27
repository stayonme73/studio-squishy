"use client";

import {
  DISCOVERY_SPLIT_PREVIEW_LABELS,
  PROJECT_SUMMARY_MOCK,
} from "@/project-summary";

type Props = {
  onContinue: () => void;
};

/** Discovery split-panel preview — service list + CTA only; full detail on Project Summary. */
export default function DiscoverySummaryPlaceholder({ onContinue }: Props) {
  const serviceNames = PROJECT_SUMMARY_MOCK.services.map((service) => service.name);
  const labels = DISCOVERY_SPLIT_PREVIEW_LABELS;

  return (
    <aside
      className="bds-summary-panel bds-summary-panel--proposal bds-summary-panel--preview"
      aria-labelledby="bds-split-preview-title"
    >
      <div className="bds-summary-panel__inner">
        <p className="bds-summary-panel__eyebrow">{labels.eyebrow}</p>
        <h2 id="bds-split-preview-title" className="bds-summary-panel__title">
          {labels.title}
        </h2>
        <p className="bds-summary-panel__body">{labels.introBody}</p>

        <section
          className="bds-summary-panel__section"
          aria-labelledby="bds-split-preview-services"
        >
          <h3 id="bds-split-preview-services" className="bds-summary-panel__section-title">
            {labels.servicesTitle}
          </h3>
          <ul className="bds-summary-panel__service-list">
            {serviceNames.map((name) => (
              <li key={name}>✓ {name}</li>
            ))}
          </ul>
        </section>

        <section
          className="bds-summary-panel__section"
          aria-labelledby="bds-split-preview-next-step"
        >
          <h3 id="bds-split-preview-next-step" className="bds-summary-panel__section-title">
            {labels.nextStepTitle}
          </h3>
          <p className="bds-summary-panel__body bds-summary-panel__next-step-lead">
            {labels.nextStepLead}
          </p>
          <ul className="bds-summary-panel__next-step-list">
            {labels.nextStepBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <button
          type="button"
          className="bds-sheet__btn bds-sheet__btn--primary bds-summary-panel__continue"
          onClick={onContinue}
        >
          {labels.cta}
        </button>
      </div>
    </aside>
  );
}
