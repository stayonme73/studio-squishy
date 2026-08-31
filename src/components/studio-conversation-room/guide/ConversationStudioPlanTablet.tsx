"use client";

import { useRef, useState, type ReactNode } from "react";

import ProjectBuilderStudioPlanSummary from "@/components/project-builder/ProjectBuilderStudioPlanSummary";
import SamsungDenimCta from "@/components/studio-conversation-room/guide/SamsungDenimCta";
import styles from "@/components/studio-conversation-room/guide/studio-guide-tablet.module.css";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import type { RouteMapJobId } from "@/config/route-map-v1";
import type { ProjectBuilderStudioPlanSummaryModel } from "@/lib/project-builder-studio-plan-summary";

import "@/app/project-builder/project-builder.css";

export type ConversationStudioPlanTabletProps = {
  model: ProjectBuilderStudioPlanSummaryModel;
  /** Customer-facing ma-001 pack members (kinds only — no producer jargon). */
  ma001CompositionMemberLabels?: readonly string[] | null;
  onEditPlan: () => void;
  onChangeRoute: () => void;
  onLooksGood: () => void;
  onOpenExtraDetails: () => void;
  onViewScope?: (jobId: RouteMapJobId) => void;
  /** Phone: expand details on this screen instead of an Activity Panel overlay. */
  extrasInPlace?: boolean;
  topControls?: ReactNode;
  bridgeError: string | null;
};

function routeCustomerLabel(routeLabel: string): string {
  const parts = routeLabel.split("·");
  return (parts[parts.length - 1] ?? routeLabel).trim();
}

/**
 * Studio Plan on the tablet — only what Voice narrates, large and readable.
 * Desktop: Revision Policy, We'll Need, and View Scope open in the Activity Panel.
 * Phone: those details expand in place on this same screen.
 */
export default function ConversationStudioPlanTablet({
  model,
  ma001CompositionMemberLabels = null,
  onEditPlan,
  onChangeRoute,
  onLooksGood,
  onOpenExtraDetails,
  onViewScope,
  extrasInPlace = false,
  topControls = null,
  bridgeError,
}: ConversationStudioPlanTabletProps) {
  const v = conversationRoomGuideV1;
  const routeLabel = routeCustomerLabel(model.routeLabel);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const extrasRef = useRef<HTMLDivElement | null>(null);

  function toggleExtrasInPlace() {
    setExtrasOpen((open) => {
      const next = !open;
      if (next) {
        window.setTimeout(() => {
          extrasRef.current?.scrollIntoView({
            block: "nearest",
            behavior: "smooth",
          });
        }, 0);
      }
      return next;
    });
  }

  return (
    <div
      className={styles.planTablet}
      data-surface="studio-plan"
      data-phone-plan={extrasInPlace ? "true" : undefined}
    >
      {topControls}

      <header className={styles.planTabletHeader}>
        <p className={styles.eyebrow}>
          {extrasInPlace ? v.studioPlanStepLabel : v.eyebrow}
        </p>
        <h1 className={styles.question}>{v.studioPlanTitle}</h1>
        {extrasInPlace ? null : (
          <aside
            className={styles.voiceSays}
            aria-label={v.studioVoiceSaysLabel}
          >
            <p className={styles.voiceSaysLabel}>{v.studioVoiceSaysLabel}</p>
            <blockquote className={styles.voiceSaysQuote}>
              {v.studioPlanVoiceOrient}
            </blockquote>
          </aside>
        )}

        <section
          className={styles.beforeCheckout}
          aria-labelledby="studio-plan-before-checkout"
        >
          <h2
            id="studio-plan-before-checkout"
            className={styles.beforeCheckoutHeading}
          >
            {v.studioPlanBeforeCheckoutHeading}
          </h2>
          <ul className={styles.beforeCheckoutList}>
            {v.studioPlanBeforeCheckoutItems.map((item) => (
              <li key={item}>
                <span className={styles.beforeCheckoutMark} aria-hidden>
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </header>

      <div className={styles.planVoiceFacts} aria-label="Studio Plan key facts">
        <section className={styles.planFactCard}>
          <p className={styles.planFactLabel}>{v.studioPlanRouteLabel}</p>
          <p className={styles.planFactValue}>{routeLabel}</p>
        </section>

        <section className={styles.planFactCard}>
          <p className={styles.planFactLabel}>{v.studioPlanServicesLabel}</p>
          <ul className={styles.planServiceList}>
            {model.deliverables.map((item) => (
              <li key={item.serviceId}>
                <span className={styles.planServiceName}>{item.title}</span>
                <span className={styles.planServicePrice}>{item.priceDisplay}</span>
              </li>
            ))}
          </ul>
        </section>

        {ma001CompositionMemberLabels &&
        ma001CompositionMemberLabels.length > 0 ? (
          <section
            className={styles.planFactCard}
            aria-label="Promotion Pack contents"
          >
            <p className={styles.planFactLabel}>Promotion Pack includes</p>
            <ul className={styles.planPackMemberList}>
              {ma001CompositionMemberLabels.map((label, index) => (
                <li key={`${label}-${index}`}>
                  <span className={styles.planServiceName}>{label}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={styles.planFactCard}>
          <p className={styles.planFactLabel}>{PROJECT_BUILDER_V1.totalLabel}</p>
          <p className={styles.planFactValueLarge}>{model.totalDisplay}</p>
        </section>

        {model.overallTimelineDisplay ? (
          <section className={styles.planFactCard}>
            <p className={styles.planFactLabel}>{v.studioPlanTimelineLabel}</p>
            <p className={styles.planFactValue}>{model.overallTimelineDisplay}</p>
            <p className={styles.planFactNote}>{v.studioPlanTimelineAsteriskNote}</p>
          </section>
        ) : null}

        {extrasInPlace ? (
          <section
            ref={extrasRef}
            className={styles.planDetailsCard}
            data-plan-details="true"
            data-open={extrasOpen ? "true" : "false"}
          >
            <button
              type="button"
              className={styles.planDetailsToggle}
              aria-expanded={extrasOpen}
              aria-controls="studio-plan-mobile-details"
              onClick={toggleExtrasInPlace}
            >
              {extrasOpen ? v.studioPlanDetailsHideLabel : v.studioPlanDetailsToggle}
            </button>
            <p className={styles.planFactNote}>{v.studioPlanDetailsOpenHint}</p>
            {extrasOpen ? (
              <div
                id="studio-plan-mobile-details"
                className={styles.planDetailsBody}
              >
                <ProjectBuilderStudioPlanSummary
                  model={model}
                  variant="extras"
                  showActions={false}
                  onEditProject={onEditPlan}
                  onContinueToCheckout={onLooksGood}
                  onViewScope={onViewScope ?? (() => undefined)}
                />
              </div>
            ) : null}
          </section>
        ) : (
          <>
            <p className={styles.planFactNote}>{v.studioPlanExtrasHint}</p>
            <button
              type="button"
              className={styles.planMoreDetailsLink}
              onClick={onOpenExtraDetails}
            >
              {v.studioPlanMoreDetailsCta} →
            </button>
          </>
        )}
      </div>

      {bridgeError ? (
        <p className={styles.planTabletError} role="alert">
          {bridgeError}
        </p>
      ) : null}

      <div
        className={styles.planTabletActions}
        data-plan-actions={extrasInPlace ? "group" : undefined}
      >
        <button
          type="button"
          className={styles.planTabletBtnSecondary}
          onClick={onChangeRoute}
        >
          {v.studioPlanChangeRouteLabel}
        </button>
        <button
          type="button"
          className={styles.planTabletBtnSecondary}
          onClick={onEditPlan}
        >
          {extrasInPlace ? v.studioPlanEditServicesLabel : v.studioPlanEditLabel}
        </button>
        {extrasInPlace ? (
          <SamsungDenimCta
            onActivate={() => {
              if (!model.canContinue) return;
              onLooksGood();
            }}
          >
            {v.studioPlanConfirmCta}
          </SamsungDenimCta>
        ) : (
          <button
            type="button"
            className={styles.planTabletBtnPrimary}
            disabled={!model.canContinue}
            onClick={onLooksGood}
          >
            {v.studioPlanConfirmCta}
          </button>
        )}
      </div>
    </div>
  );
}
