"use client";

import Link from "next/link";

import type { DiscoverySummaryModel, DiscoverySummaryServiceItem } from "@/discovery-summary";
import StudioPlanReviewScene from "@/components/studio-plan-review/StudioPlanReviewScene";
import type { StudioPlanReviewModel } from "@/studio-plan-review";
import type { ServiceId } from "@/catalog/types";
import {
  PROJECT_SUMMARY_LABELS,
  PROJECT_SUMMARY_MOCK,
  type DiscoveryAnswerHeardItem,
  type ProjectSummaryMockService,
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

function RecommendedServiceRow({
  name,
  why,
}: {
  name: string;
  why: string;
}) {
  return (
    <li className="ps-recommend__service-row">
      <span className="ps-recommend__service-name" aria-hidden="true">
        ✅
      </span>{" "}
      <span className="ps-recommend__service-name">{name}</span>
      <div className="ps-recommend__service-why">
        <span className="ps-recommend__why-label">{PROJECT_SUMMARY_LABELS.recommendWhyLabel}</span>
        <p className="ps-recommend__why-body">{why}</p>
      </div>
    </li>
  );
}

function RecommendedServiceFromSummary({ service }: { service: DiscoverySummaryServiceItem }) {
  return (
    <RecommendedServiceRow name={service.title} why={service.explanation} />
  );
}

/** Project Summary — heard + recommendation + packages + customize + disclaimer + approve (presentation only). */
/** Decision-page proposal aesthetic — see docs/decision-page-visual-language-v1.md */
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
  const hasRecommendations = summary.recommendedServices.length > 0;
  const mockServices: readonly ProjectSummaryMockService[] = PROJECT_SUMMARY_MOCK.services;

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
        <p className="ps-recommend__lead">{PROJECT_SUMMARY_LABELS.recommendLead}</p>
        {summary.warnings.length > 0 ? (
          <ul className="ps-warnings" aria-label="Recommendation notices">
            {summary.warnings.map((warning) => (
              <li key={`${warning.kind}-${warning.serviceId ?? "global"}`}>{warning.message}</li>
            ))}
          </ul>
        ) : null}
        <ul className="ps-recommend__service-list">
          {hasRecommendations
            ? summary.recommendedServices.map((service) => (
                <RecommendedServiceFromSummary key={service.serviceId} service={service} />
              ))
            : mockServices.map((service) => (
                <RecommendedServiceRow key={service.name} name={service.name} why={service.why} />
              ))}
        </ul>
      </section>

      <section className="utility-card ps-section" aria-labelledby="ps-packages-title">
        <h2 id="ps-packages-title" className="utility-card__title">
          {PROJECT_SUMMARY_LABELS.packagesTitle}
        </h2>
        <p className="ps-packages__lead">{PROJECT_SUMMARY_LABELS.packagesLead}</p>
        <ul className="ps-packages__grid" aria-label={PROJECT_SUMMARY_LABELS.packagesSelectLabel}>
          {PROJECT_SUMMARY_MOCK.packages.map((pkg) => (
            <li key={pkg.id} className="ps-packages__card">
              <p className="ps-packages__name">{pkg.name}</p>
              <p className="ps-packages__tagline">{pkg.tagline}</p>
              <p className="ps-packages__price">{pkg.priceLabel}</p>
              <button type="button" className="utility-btn utility-btn--secondary ps-packages__select" disabled>
                {PROJECT_SUMMARY_LABELS.packagesSelectLabel}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="utility-card ps-section" aria-labelledby="ps-changes-title">
        <h2 id="ps-changes-title" className="utility-card__title">
          {PROJECT_SUMMARY_LABELS.changesTitle}
        </h2>
        <p className="ps-changes__lead">{PROJECT_SUMMARY_LABELS.changesLead}</p>
        <p className="ps-changes__powers-intro">{PROJECT_SUMMARY_LABELS.changesPowersIntro}</p>
        <ul className="ps-changes__powers">
          {PROJECT_SUMMARY_LABELS.changesPowers.map((power) => (
            <li key={power}>{power}</li>
          ))}
        </ul>
        <p className="ps-changes__auto-update">{PROJECT_SUMMARY_LABELS.changesAutoUpdate}</p>
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
          />
        </div>
      </section>

      <section className="utility-card ps-section" aria-labelledby="ps-disclaimer-title">
        <h2 id="ps-disclaimer-title" className="utility-card__title">
          {PROJECT_SUMMARY_LABELS.disclaimerTitle}
        </h2>
        <p className="ps-disclaimer__body">{PROJECT_SUMMARY_LABELS.disclaimerBody}</p>
        <p className="ps-approve__total">
          {PROJECT_SUMMARY_LABELS.totalInvestmentLabel}:{" "}
          {hasRecommendations && summary.totalInvestment.display
            ? summary.totalInvestment.display
            : PROJECT_SUMMARY_LABELS.totalInvestmentPlaceholder}
        </p>
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
