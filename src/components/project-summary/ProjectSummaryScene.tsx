"use client";

import Link from "next/link";

import type { DiscoverySummaryModel, DiscoverySummaryServiceItem } from "@/discovery-summary";
import StudioPlanReviewScene from "@/components/studio-plan-review/StudioPlanReviewScene";
import type { StudioPlanReviewModel } from "@/studio-plan-review";
import type { ServiceId } from "@/catalog/types";
import {
  PROJECT_SUMMARY_LABELS,
  type DiscoveryAnswerHeardItem,
} from "@/project-summary";

type Props = {
  heard: readonly DiscoveryAnswerHeardItem[];
  summary: DiscoverySummaryModel;
  plan: StudioPlanReviewModel;
  editDiscoveryHref: string;
  onRemove: (serviceId: ServiceId) => void;
  onSwap: (fromId: ServiceId, toId: ServiceId) => void;
  onAdd: (serviceId: ServiceId) => void;
  onConfirm: () => void;
};

function RecommendedService({ service }: { service: DiscoverySummaryServiceItem }) {
  return (
    <li className="ps-recommend__item">
      <h3 className="ps-recommend__title">{service.title}</h3>
      <p className="ps-recommend__explanation">{service.explanation}</p>
      <p className="ps-recommend__investment">{service.investment.display}</p>
    </li>
  );
}

/** Three-section Project Summary — presentation only. */
export default function ProjectSummaryScene({
  heard,
  summary,
  plan,
  editDiscoveryHref,
  onRemove,
  onSwap,
  onAdd,
  onConfirm,
}: Props) {
  return (
    <div className="ps-content utility-content">
      <section className="utility-card ps-section" aria-labelledby="ps-heard-title">
        <h2 id="ps-heard-title" className="utility-card__title">
          {PROJECT_SUMMARY_LABELS.heardTitle}
        </h2>
        {heard.length === 0 ? (
          <p className="ps-muted">{PROJECT_SUMMARY_LABELS.heardEmpty}</p>
        ) : (
          <dl className="ps-heard__list">
            {heard.map((item) => (
              <div key={item.label} className="ps-heard__row">
                <dt className="ps-heard__label">{item.label}</dt>
                <dd className="ps-heard__value">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="utility-card ps-section" aria-labelledby="ps-recommend-title">
        <h2 id="ps-recommend-title" className="utility-card__title">
          {PROJECT_SUMMARY_LABELS.recommendTitle}
        </h2>
        {summary.warnings.length > 0 ? (
          <ul className="ps-warnings" aria-label="Recommendation notices">
            {summary.warnings.map((warning) => (
              <li key={`${warning.kind}-${warning.serviceId ?? "global"}`}>{warning.message}</li>
            ))}
          </ul>
        ) : null}
        {summary.recommendedServices.length === 0 ? (
          <p className="ps-muted">{summary.warnings[0]?.message ?? plan.emptyStateMessage}</p>
        ) : (
          <ol className="ps-recommend__list">
            {summary.recommendedServices.map((service) => (
              <RecommendedService key={service.serviceId} service={service} />
            ))}
          </ol>
        )}
        {summary.totalInvestment.display ? (
          <p className="ps-recommend__total">
            Estimated investment: {summary.totalInvestment.display}
          </p>
        ) : null}
      </section>

      <section className="utility-card ps-section" aria-labelledby="ps-changes-title">
        <h2 id="ps-changes-title" className="utility-card__title">
          {PROJECT_SUMMARY_LABELS.changesTitle}
        </h2>
        <p className="ps-changes__lead">{PROJECT_SUMMARY_LABELS.changesLead}</p>
        <Link href={editDiscoveryHref} className="utility-btn utility-btn--ghost ps-edit-link">
          {PROJECT_SUMMARY_LABELS.editDiscovery}
        </Link>
        <div className="ps-plan-review">
          <StudioPlanReviewScene
            model={plan}
            onRemove={onRemove}
            onSwap={onSwap}
            onAdd={onAdd}
            onApprove={onConfirm}
            showApprove={false}
          />
        </div>
        <div className="ps-confirm">
          <button
            type="button"
            className="utility-btn utility-btn--primary"
            disabled={!plan.canApprove}
            onClick={onConfirm}
          >
            {PROJECT_SUMMARY_LABELS.confirmPlan}
          </button>
        </div>
      </section>
    </div>
  );
}
