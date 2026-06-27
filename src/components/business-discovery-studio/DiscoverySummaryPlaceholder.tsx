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

  return (
    <aside
      className="bds-summary-panel bds-summary-panel--proposal bds-summary-panel--preview"
      aria-labelledby="bds-split-preview-lead"
    >
      <div className="bds-summary-panel__inner">
        <p className="bds-summary-panel__eyebrow">{DISCOVERY_SPLIT_PREVIEW_LABELS.eyebrow}</p>

        <section className="bds-summary-panel__section" aria-labelledby="bds-split-preview-lead">
          <p id="bds-split-preview-lead" className="bds-summary-panel__body bds-summary-panel__lead">
            {DISCOVERY_SPLIT_PREVIEW_LABELS.recommendLead}
          </p>
          <ul className="bds-summary-panel__service-list">
            {serviceNames.map((name) => (
              <li key={name}>✅ {name}</li>
            ))}
          </ul>
        </section>

        <p className="bds-summary-panel__body">{DISCOVERY_SPLIT_PREVIEW_LABELS.preparedBody}</p>
        <p className="bds-summary-panel__body bds-summary-panel__next-step">
          {DISCOVERY_SPLIT_PREVIEW_LABELS.nextStepBody}
        </p>

        <button
          type="button"
          className="bds-sheet__btn bds-sheet__btn--primary bds-summary-panel__continue"
          onClick={onContinue}
        >
          {DISCOVERY_SPLIT_PREVIEW_LABELS.cta}
        </button>
      </div>
    </aside>
  );
}
