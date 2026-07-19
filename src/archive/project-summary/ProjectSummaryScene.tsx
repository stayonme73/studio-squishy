"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { DiscoverySummaryModel, DiscoverySummaryServiceItem } from "@/discovery-summary";
import StudioPlanReviewScene from "@/archive/studio-plan-review/StudioPlanReviewScene";
import { SecureCheckoutGrid } from "@/components/payment/PaymentCheckoutScene";
import type { StudioPlanReviewModel } from "@/studio-plan-review";
import type { ServiceId } from "@/catalog/types";
import type { ApprovalAcknowledgment } from "@/config/studio-board";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { buildPaymentPlanSummaryFromPlan } from "@/lib/payment-plan-summary";
import {
  PROJECT_SUMMARY_LABELS,
  type DiscoveryAnswerHeardItem,
} from "@/project-summary";
import { filterConsiderNextServices } from "@/project-summary/filterConsiderNextServices";

type Props = {
  heard: readonly DiscoveryAnswerHeardItem[];
  summary: DiscoverySummaryModel;
  plan: StudioPlanReviewModel;
  editDiscoveryHref: string;
  packageId?: StudioGuidePackageId;
  onRemove: (serviceId: ServiceId) => void;
  onSwap: (fromId: ServiceId, toId: ServiceId) => void;
  onAdd: (serviceId: ServiceId) => void;
  onSavePlanBeforePayment: (acknowledgment: ApprovalAcknowledgment) => boolean;
  onOpenServiceGuide: (serviceId: ServiceId) => void;
  onViewPlanDetails: () => void;
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
  isSelected,
  serviceId,
  onAdd,
}: {
  name: string;
  why: string;
  isSelected: boolean;
  serviceId: ServiceId;
  onAdd: (serviceId: ServiceId) => void;
}) {
  return (
    <li
      className={
        isSelected
          ? "ps-recommend__service-row"
          : "ps-recommend__service-row ps-recommend__service-row--consider"
      }
    >
      {isSelected ? (
        <>
          <span className="ps-recommend__service-name" aria-hidden="true">
            ✅
          </span>{" "}
          <span className="ps-recommend__service-name">{name}</span>
        </>
      ) : (
        <span className="ps-recommend__service-name">{name}</span>
      )}
      <div className="ps-recommend__service-why">
        <span className="ps-recommend__why-label">{PROJECT_SUMMARY_LABELS.recommendWhyLabel}</span>
        <p className="ps-recommend__why-body">{why}</p>
      </div>
      {!isSelected ? (
        <button
          type="button"
          className="utility-btn utility-btn--ghost ps-consider__add"
          onClick={() => onAdd(serviceId)}
        >
          Add to Plan
        </button>
      ) : null}
    </li>
  );
}

function ConsiderNextServiceRow({
  service,
  onAdd,
}: {
  service: DiscoverySummaryServiceItem;
  onAdd: (serviceId: ServiceId) => void;
}) {
  return (
    <li className="ps-recommend__service-row ps-recommend__service-row--consider">
      <span className="ps-recommend__service-name">{service.title}</span>
      <div className="ps-recommend__service-why">
        <span className="ps-recommend__why-label">{PROJECT_SUMMARY_LABELS.recommendWhyLabel}</span>
        <p className="ps-recommend__why-body">{service.explanation}</p>
      </div>
      <button
        type="button"
        className="utility-btn utility-btn--ghost ps-consider__add"
        onClick={() => onAdd(service.serviceId)}
      >
        Add to Plan
      </button>
    </li>
  );
}

function RecommendedServiceFromSummary({
  service,
  isSelected,
  onAdd,
}: {
  service: DiscoverySummaryServiceItem;
  isSelected: boolean;
  onAdd: (serviceId: ServiceId) => void;
}) {
  return (
    <RecommendedServiceRow
      name={service.title}
      why={service.explanation}
      isSelected={isSelected}
      serviceId={service.serviceId}
      onAdd={onAdd}
    />
  );
}

function DiscoverySummarySection({
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
      className="utility-card ps-section ps-section--reference"
      aria-labelledby="ps-discovery-summary-title"
    >
      <h2 id="ps-discovery-summary-title" className="utility-card__title utility-card__title--compact">
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

/** Project Summary — wide workspace: left = why we recommend; right = how you buy. */
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
  onOpenServiceGuide,
  onViewPlanDetails,
}: Props) {
  const hasRecommendations = summary.recommendedServices.length > 0;
  const selectedServiceSet = useMemo(
    () => new Set(plan.selectedServiceIds),
    [plan.selectedServiceIds],
  );
  const livePlanSummary = useMemo(() => buildPaymentPlanSummaryFromPlan(plan), [plan]);
  const visibleConsiderNext = useMemo(
    () => filterConsiderNextServices(summary.considerNextServices, plan.selectedServiceIds),
    [summary.considerNextServices, plan.selectedServiceIds],
  );

  return (
    <div className="ps-content ps-workspace utility-content">
      <div className="ps-workspace__col ps-workspace__col--left">
        <section
          className="utility-card ps-section ps-section--hero"
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
            {hasRecommendations ? (
              summary.recommendedServices.map((service) => (
                <RecommendedServiceFromSummary
                  key={service.serviceId}
                  service={service}
                  isSelected={selectedServiceSet.has(service.serviceId)}
                  onAdd={onAdd}
                />
              ))
            ) : (
              <li className="ps-muted">{PROJECT_SUMMARY_LABELS.recommendLead}</li>
            )}
          </ul>
          {summary.estimatedTimeline.customerLabel ? (
            <div className="ps-recommend__timeline">
              <span className="ps-recommend__timeline-label">
                {PROJECT_SUMMARY_LABELS.recommendTimelineLabel}
              </span>
              <p className="ps-recommend__timeline-body">{summary.estimatedTimeline.customerLabel}</p>
            </div>
          ) : null}
          {visibleConsiderNext.length > 0 ? (
            <div className="ps-recommend__consider">
              <h3 className="ps-recommend__consider-title">
                {PROJECT_SUMMARY_LABELS.considerNextTitle}
              </h3>
              <p className="ps-recommend__consider-lead">{PROJECT_SUMMARY_LABELS.considerNextLead}</p>
              <ul className="ps-recommend__service-list ps-recommend__service-list--consider">
                {visibleConsiderNext.map((service) => (
                  <ConsiderNextServiceRow key={service.serviceId} service={service} onAdd={onAdd} />
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <DiscoverySummarySection heard={heard} editDiscoveryHref={editDiscoveryHref} />

        <section
          className="utility-card ps-section"
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
              onApprove={() => onSavePlanBeforePayment({
                acknowledgmentVersion: "",
                acknowledgmentText: "",
                acknowledgedAt: new Date().toISOString(),
              })}
              hideApprove
              onOpenServiceGuide={onOpenServiceGuide}
            />
          </div>
        </section>
      </div>

      <div className="ps-workspace__col ps-workspace__col--right">
        {/* Bundles archived — see src/archive/project-summary/ProjectSummaryBundlesSection.tsx */}

        <section
          className="utility-card ps-section ps-workspace__col--checkout payment-page"
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
              recommendationNotice={{
                title: PROJECT_SUMMARY_LABELS.disclaimerTitle,
                lines: PROJECT_SUMMARY_LABELS.disclaimerBodyLines,
              }}
              onBeforePayment={onSavePlanBeforePayment}
              onOpenServiceGuide={onOpenServiceGuide}
              onViewPlanDetails={onViewPlanDetails}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
