"use client";

import type { ProjectDetailsPrefill } from "@/lib/project-details-prefill";
import { projectDetailsPrefillLabels } from "@/lib/project-details-prefill";

type Props = {
  prefill: ProjectDetailsPrefill;
};

export default function ProjectDetailsPrefillPanel({ prefill }: Props) {
  const labels = projectDetailsPrefillLabels();

  return (
    <aside className="pd-prefill utility-card" aria-label="Project context">
      <h2 className="pd-prefill__heading">Your approved plan</h2>

      {prefill.businessName ? (
        <div className="pd-prefill__block">
          <p className="pd-prefill__label">{labels.businessNameLabel}</p>
          <p className="pd-prefill__value">{prefill.businessName}</p>
        </div>
      ) : null}

      {prefill.businessOffer ? (
        <div className="pd-prefill__block">
          <p className="pd-prefill__label">{labels.businessOfferLabel}</p>
          <p className="pd-prefill__value">{prefill.businessOffer}</p>
        </div>
      ) : null}

      {prefill.selectedServices.length > 0 ? (
        <div className="pd-prefill__block">
          <p className="pd-prefill__label">{labels.selectedServicesLabel}</p>
          <ul className="pd-prefill__services">
            {prefill.selectedServices.map((service) => (
              <li key={service.skuId}>{service.serviceName}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {prefill.discoverySummary.length > 0 ? (
        <div className="pd-prefill__block">
          <p className="pd-prefill__label">{labels.discoverySummaryLabel}</p>
          <dl className="pd-prefill__discovery">
            {prefill.discoverySummary.map((item) => (
              <div key={item.label} className="pd-prefill__discovery-row">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </aside>
  );
}
