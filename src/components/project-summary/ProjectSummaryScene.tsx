"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { DiscoverySummaryModel, DiscoverySummaryServiceItem } from "@/discovery-summary";
import StudioPlanReviewScene from "@/components/studio-plan-review/StudioPlanReviewScene";
import { SecureCheckoutGrid } from "@/components/payment/PaymentCheckoutScene";
import type { StudioPlanReviewModel } from "@/studio-plan-review";
import type { ServiceId } from "@/catalog/types";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { buildPaymentPlanSummaryFromPlan } from "@/lib/payment-plan-summary";
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
  packageId?: StudioGuidePackageId;
  onRemove: (serviceId: ServiceId) => void;
  onSwap: (fromId: ServiceId, toId: ServiceId) => void;
  onAdd: (serviceId: ServiceId) => void;
  onSavePlanBeforePayment: () => boolean;
};

const HEARD_HIGHLIGHT_COUNT = 2;
const HEARD_HIGHLIGHT_MAX_CHARS = 48;

function truncateHeardValue(value: string, maxChars = HEARD_HIGHLIGHT_MAX_CHARS): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars - 1).trimEnd()}…`;
}

function formatHeardHighlight(item: DiscoveryAnswerHeardItem): string {
  return `${item.label}: ${truncateHeardValue(item.value)}`;
}

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

function DiscoveryReferenceSection({
  heard,
  editDiscoveryHref,
}: {
  heard: readonly DiscoveryAnswerHeardItem[];
  editDiscoveryHref: string;
}) {
  const highlights = heard.slice(0, HEARD_HIGHLIGHT_COUNT).map(formatHeardHighlight);
  const answerCountLabel =
    heard.length === 1 ? "1 answer from Discovery" : `${heard.length} answers from Discovery`;

  return (
    <section
      className="utility-card ps-section ps-section--reference ps-workspace__row ps-workspace__row--full"
      aria-labelledby="ps-heard-title"
    >
      <h2 id="ps-heard-title" className="utility-card__title utility-card__title--compact">
        {PROJECT_SUMMARY_LABELS.heardTitle}
      </h2>
      <p className="ps-heard__reference-lead">{PROJECT_SUMMARY_LABELS.heardReferenceLead}</p>
      {heard.length === 0 ? (
        <p className="ps-muted">{PROJECT_SUMMARY_LABELS.heardEmpty}</p>
      ) : (
        <>
          <p className="ps-heard__summary">
            <span className="ps-heard__summary-count">{answerCountLabel}</span>
            {highlights.length > 0 ? (
              <>
                <span className="ps-heard__summary-sep" aria-hidden="true">
                  {" "}
                  —{" "}
                </span>
                <span className="ps-heard__summary-highlights">{highlights.join(" · ")}</span>
              </>
            ) : null}
          </p>
          <details className="ps-heard__details">
            <summary className="ps-heard__expand">{PROJECT_SUMMARY_LABELS.heardExpandLabel}</summary>
            <dl className="ps-heard__list">
              {heard.map((item) => (
                <div key={item.label} className="ps-heard__row">
                  <dt className="ps-heard__label">{item.label}</dt>
                  <dd className="ps-heard__value">{item.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      )}
      <div className="ps-heard__actions">
        <Link href={editDiscoveryHref} className="utility-btn utility-btn--ghost ps-edit-link">
          {PROJECT_SUMMARY_LABELS.editDiscovery}
        </Link>
      </div>
    </section>
  );
}

/** Project Summary — wide workspace: recommend + bundles | customize + checkout | heard reference. */
/** Decision-page proposal aesthetic — see docs/decision-page-visual-language-v1.md */
export default function ProjectSummaryScene({
  heard,
  summary,
  plan,
  editDiscoveryHref,
  packageId,
  onRemove,
  onSwap,
  onAdd,
  onSavePlanBeforePayment,
}: Props) {
  const hasRecommendations = summary.recommendedServices.length > 0;
  const mockServices: readonly ProjectSummaryMockService[] = PROJECT_SUMMARY_MOCK.services;
  const livePlanSummary = useMemo(() => buildPaymentPlanSummaryFromPlan(plan), [plan]);

  return (
    <div className="ps-content ps-workspace utility-content">
      <div className="ps-workspace__row ps-workspace__row--top">
        <section
          className="utility-card ps-section ps-section--hero ps-workspace__col"
          aria-labelledby="ps-recommend-title"
        >
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

        <section
          className="utility-card ps-section ps-workspace__col"
          aria-labelledby="ps-packages-title"
        >
          <h2 id="ps-packages-title" className="utility-card__title">
            {PROJECT_SUMMARY_LABELS.packagesTitle}
          </h2>
          <p className="ps-packages__lead">{PROJECT_SUMMARY_LABELS.packagesLead}</p>
          <ul className="ps-packages__grid" aria-label={PROJECT_SUMMARY_LABELS.packagesSelectLabel}>
            {PROJECT_SUMMARY_MOCK.packages.map((pkg) => (
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
      </div>

      <div className="ps-workspace__row ps-workspace__row--middle">
        <section
          className="utility-card ps-section ps-workspace__col"
          aria-labelledby="ps-changes-title"
        >
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
          <div className="ps-plan-review">
            <StudioPlanReviewScene
              model={plan}
              onRemove={onRemove}
              onSwap={onSwap}
              onAdd={onAdd}
              onApprove={onSavePlanBeforePayment}
              hideApprove
            />
          </div>
        </section>

        <section
          className="utility-card ps-section ps-workspace__col ps-workspace__col--checkout payment-page"
          aria-labelledby="ps-checkout-title"
        >
          <h2 id="ps-checkout-title" className="utility-card__title">
            {PROJECT_SUMMARY_LABELS.checkoutTitle}
          </h2>
          <div className="ps-checkout-embedded">
            <SecureCheckoutGrid
              layout="embedded"
              packageId={packageId}
              planSummary={livePlanSummary}
              disclaimerText={PROJECT_SUMMARY_LABELS.disclaimerBody}
              onBeforePayment={onSavePlanBeforePayment}
            />
          </div>
        </section>
      </div>

      <DiscoveryReferenceSection heard={heard} editDiscoveryHref={editDiscoveryHref} />
    </div>
  );
}
