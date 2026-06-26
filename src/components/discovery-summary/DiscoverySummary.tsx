import type { DiscoverySummaryModel, DiscoverySummaryServiceItem } from "@/discovery-summary";

type Props = {
  model: DiscoverySummaryModel;
};

function ServiceItem({ service }: { service: DiscoverySummaryServiceItem }) {
  return (
    <li className="ds-service">
      <header className="ds-service__header">
        <h3 className="ds-service__title">{service.title}</h3>
        {service.rank === 1 ? (
          <span className="ds-service__badge">Primary recommendation</span>
        ) : null}
      </header>
      <p className="ds-service__explanation">{service.explanation}</p>
      {service.deliverables.length > 0 ? (
        <div className="ds-service__block">
          <p className="ds-service__label">Deliverables included</p>
          <ul className="ds-deliverables">
            {service.deliverables.map((item) => (
              <li key={item.label}>
                {item.label}
                {item.quantity > 1 ? ` × ${item.quantity}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <dl className="ds-service__meta">
        <div>
          <dt>Estimated investment</dt>
          <dd>{service.investment.display}</dd>
        </div>
        {service.timelineLabel ? (
          <div>
            <dt>Timeline</dt>
            <dd>{service.timelineLabel}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

/** Renders a DiscoverySummaryModel — presentation only, no scoring or catalog logic. */
export default function DiscoverySummary({ model }: Props) {
  return (
    <div className="ds-content utility-content">
      {model.requiresApproval ? (
        <p className="ds-approval-badge" role="status">
          Review recommended before proceeding
        </p>
      ) : null}

      {model.warnings.length > 0 ? (
        <section className="ds-warnings" aria-label="Recommendation notices">
          <ul className="ds-warnings__list">
            {model.warnings.map((warning) => (
              <li key={`${warning.kind}-${warning.serviceId ?? "global"}`} className="ds-warnings__item">
                {warning.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="utility-card ds-services" aria-labelledby="ds-services-title">
        <h2 id="ds-services-title" className="utility-card__title">
          Recommended services
        </h2>
        {model.recommendedServices.length === 0 ? (
          <p className="ds-muted">No services matched your discovery answers yet.</p>
        ) : (
          <ol className="ds-services__list">
            {model.recommendedServices.map((service) => (
              <ServiceItem key={service.serviceId} service={service} />
            ))}
          </ol>
        )}
      </section>

      {model.additionalStudioServices.length > 0 ? (
        <section
          className="utility-card ds-additional-services"
          aria-labelledby="ds-additional-services-title"
        >
          <h2 id="ds-additional-services-title" className="utility-card__title">
            {model.sectionLabels.additionalStudioServices}
          </h2>
          <p className="ds-additional-services__note">
            These services are not automatically included in your Studio Plan — they are optional
            additions you may add if you want to expand your scope.
          </p>
          <ol className="ds-services__list">
            {model.additionalStudioServices.map((service) => (
              <ServiceItem key={service.serviceId} service={service} />
            ))}
          </ol>
        </section>
      ) : null}

      <div className="utility-grid ds-summary-grid">
        <section className="utility-card" aria-labelledby="ds-investment-title">
          <h2 id="ds-investment-title" className="utility-card__title">
            Estimated investment
          </h2>
          <p className="ds-summary-value">{model.totalInvestment.display}</p>
        </section>

        <section className="utility-card" aria-labelledby="ds-timeline-title">
          <h2 id="ds-timeline-title" className="utility-card__title">
            Estimated timeline
          </h2>
          <p className="ds-summary-value">{model.estimatedTimeline.customerLabel}</p>
        </section>
      </div>

      <section className="utility-card ds-next-step" aria-labelledby="ds-next-step-title">
        <h2 id="ds-next-step-title" className="utility-card__title">
          {model.nextStep.headline}
        </h2>
        <p className="ds-next-step__body">{model.nextStep.body}</p>
        <button type="button" className="utility-btn utility-btn--primary" disabled aria-disabled="true">
          {model.nextStep.actionLabel}
        </button>
      </section>
    </div>
  );
}
