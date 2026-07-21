"use client";

import styles from "@/components/studio-conversation-room/guide/studio-guide-tablet.module.css";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import type { ProjectBuilderStudioPlanSummaryModel } from "@/lib/project-builder-studio-plan-summary";

export type ConversationStudioPlanTabletProps = {
  model: ProjectBuilderStudioPlanSummaryModel;
  onEditPlan: () => void;
  onChangeRoute: () => void;
  onLooksGood: () => void;
  onOpenExtraDetails: () => void;
  bridgeError: string | null;
};

function routeCustomerLabel(routeLabel: string): string {
  const parts = routeLabel.split("·");
  return (parts[parts.length - 1] ?? routeLabel).trim();
}

/**
 * Studio Plan on the tablet — only what Voice narrates, large and readable.
 * Revision Policy, We'll Need, and View Scope open in the Activity Panel.
 */
export default function ConversationStudioPlanTablet({
  model,
  onEditPlan,
  onChangeRoute,
  onLooksGood,
  onOpenExtraDetails,
  bridgeError,
}: ConversationStudioPlanTabletProps) {
  const v = conversationRoomGuideV1;
  const routeLabel = routeCustomerLabel(model.routeLabel);

  return (
    <div className={styles.planTablet} data-surface="studio-plan">
      <header className={styles.planTabletHeader}>
        <p className={styles.eyebrow}>{v.eyebrow}</p>
        <h1 className={styles.question}>{v.studioPlanTitle}</h1>
        <aside
          className={styles.voiceSays}
          aria-label={v.studioVoiceSaysLabel}
        >
          <p className={styles.voiceSaysLabel}>{v.studioVoiceSaysLabel}</p>
          <blockquote className={styles.voiceSaysQuote}>
            {v.studioPlanVoiceOrient}
          </blockquote>
        </aside>

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

        <p className={styles.planFactNote}>{v.studioPlanExtrasHint}</p>
        <button
          type="button"
          className={styles.planMoreDetailsLink}
          onClick={onOpenExtraDetails}
        >
          {v.studioPlanMoreDetailsCta} →
        </button>
      </div>

      {bridgeError ? (
        <p className={styles.planTabletError} role="alert">
          {bridgeError}
        </p>
      ) : null}

      <div className={styles.planTabletActions}>
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
          {v.studioPlanEditLabel}
        </button>
        <button
          type="button"
          className={styles.planTabletBtnPrimary}
          disabled={!model.canContinue}
          onClick={onLooksGood}
        >
          {v.studioPlanConfirmCta}
        </button>
      </div>
    </div>
  );
}
