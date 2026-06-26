import type {
  StudioPlanReviewModel,
  StudioPlanReviewServiceItem,
} from "@/studio-plan-review";
import type { ServiceId } from "@/catalog/types";

type Props = {
  model: StudioPlanReviewModel;
  onRemove: (serviceId: ServiceId) => void;
  onSwap: (fromId: ServiceId, toId: ServiceId) => void;
  onAdd: (serviceId: ServiceId) => void;
  onApprove: () => void;
};

function PlanServiceRow({
  service,
  onRemove,
  onSwap,
}: {
  service: StudioPlanReviewServiceItem;
  onRemove: (serviceId: ServiceId) => void;
  onSwap: (fromId: ServiceId, toId: ServiceId) => void;
}) {
  return (
    <li className="spr-service">
      <div className="spr-service__header">
        <h3 className="spr-service__title">{service.title}</h3>
        <span className="spr-service__price">{service.pricingDisplay}</span>
      </div>
      <div className="spr-service__actions">
        <button
          type="button"
          className="utility-btn utility-btn--ghost spr-service__btn"
          onClick={() => onRemove(service.serviceId)}
        >
          Remove
        </button>
        {service.swapCandidates.length > 0 ? (
          <label className="spr-service__swap">
            <span className="spr-service__swap-label">Swap</span>
            <select
              className="spr-service__swap-select"
              defaultValue=""
              onChange={(event) => {
                const toId = event.target.value as ServiceId;
                if (!toId) return;
                onSwap(service.serviceId, toId);
                event.target.value = "";
              }}
            >
              <option value="">Choose…</option>
              {service.swapCandidates.map((candidate) => (
                <option key={candidate.serviceId} value={candidate.serviceId}>
                  {candidate.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </li>
  );
}

/** Renders a StudioPlanReviewModel — presentation only, no scoring or catalog logic. */
export default function StudioPlanReviewScene({
  model,
  onRemove,
  onSwap,
  onAdd,
  onApprove,
}: Props) {
  return (
    <div className="spr-content utility-content">
      {model.warnings.length > 0 ? (
        <section className="spr-warnings" aria-label="Plan notices">
          <ul className="spr-warnings__list">
            {model.warnings.map((message) => (
              <li key={message} className="spr-warnings__item">
                {message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.emptyStateMessage ? (
        <p className="spr-empty" role="status">
          {model.emptyStateMessage}
        </p>
      ) : null}

      <section className="utility-card spr-section" aria-labelledby="spr-included-title">
        <h2 id="spr-included-title" className="utility-card__title">
          {model.labels.includedServices}
        </h2>
        {model.includedServices.length === 0 ? (
          <p className="spr-muted">No included services yet.</p>
        ) : (
          <ul className="spr-services__list">
            {model.includedServices.map((service) => (
              <PlanServiceRow
                key={service.serviceId}
                service={service}
                onRemove={onRemove}
                onSwap={onSwap}
              />
            ))}
          </ul>
        )}
      </section>

      {model.additionalStudioServices.length > 0 ? (
        <section className="utility-card spr-section" aria-labelledby="spr-additional-title">
          <h2 id="spr-additional-title" className="utility-card__title">
            {model.labels.additionalStudioServices}
          </h2>
          <ul className="spr-services__list">
            {model.additionalStudioServices.map((service) => (
              <PlanServiceRow
                key={service.serviceId}
                service={service}
                onRemove={onRemove}
                onSwap={onSwap}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {model.addedToPlanServices.length > 0 ? (
        <section className="utility-card spr-section" aria-labelledby="spr-added-title">
          <h2 id="spr-added-title" className="utility-card__title">
            {model.labels.addedToPlan}
          </h2>
          <ul className="spr-services__list">
            {model.addedToPlanServices.map((service) => (
              <PlanServiceRow
                key={service.serviceId}
                service={service}
                onRemove={onRemove}
                onSwap={onSwap}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="utility-card spr-section" aria-labelledby="spr-menu-title">
        <h2 id="spr-menu-title" className="utility-card__title">
          Studio Services
        </h2>
        {model.availableToAdd.length === 0 ? (
          <p className="spr-muted">All available services are already in your plan.</p>
        ) : (
          <ul className="spr-menu__list">
            {model.availableToAdd.map((service) => (
              <li key={service.serviceId} className="spr-menu__item">
                <div>
                  <p className="spr-menu__title">{service.title}</p>
                  <p className="spr-menu__price">{service.pricingDisplay}</p>
                </div>
                <button
                  type="button"
                  className="utility-btn utility-btn--ghost spr-menu__btn"
                  onClick={() => onAdd(service.serviceId)}
                >
                  {model.labels.addService}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="utility-card spr-section spr-cost" aria-labelledby="spr-cost-title">
        <h2 id="spr-cost-title" className="utility-card__title">
          {model.labels.additionalCost}
        </h2>
        <p className="spr-cost__value">{model.additionalCost.display}</p>
      </section>

      <div className="spr-approve">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={!model.canApprove}
          onClick={onApprove}
        >
          {model.labels.approvePlan}
        </button>
      </div>
    </div>
  );
}
