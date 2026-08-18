"use client";

import ConversationRouteChoose from "@/components/studio-conversation-room/guide/ConversationRouteChoose";
import ConversationStudioPlanTablet from "@/components/studio-conversation-room/guide/ConversationStudioPlanTablet";
import styles from "@/components/studio-conversation-room/guide/studio-guide-tablet.module.css";
import {
  conversationRoomGuideV1,
  getConversationRoomGuideQuestion,
  shouldShowDeadlineFormatHint,
} from "@/config/conversation-room-guide-v1";
import type { ConversationRoomStage } from "@/config/conversation-room-stage-v1";
import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import type { GuideConversationStep } from "@/config/studio-guide-conversation-v1";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import {
  deadlineStatusLabel,
  type GuideCaptureDraftV1,
} from "@/lib/studio-guide-capture";
import type { ProjectBuilderStudioPlanSummaryModel } from "@/lib/project-builder-studio-plan-summary";

export type StudioGuideTabletViewProps = {
  step: GuideConversationStep;
  /** Desk stage — only `opening` keeps Guide question controls actionable. */
  stage: ConversationRoomStage;
  draft: GuideCaptureDraftV1;
  selectedBubbles: string[];
  correcting: boolean;
  error: string | null;
  onToggleBubble: (bubble: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  onConfirm: () => void;
  onCorrect: () => void;
  onCorrectTarget: (step: GuideConversationStep) => void;
  /** Re-open the stage’s Activity Panel when it was closed (services+). */
  onOpenStagePanel?: () => void;
  /** Return to Choose Your Route without hunting through panels. */
  onChangeRoute?: () => void;
  /** Route stage — tap a lane to preview; confirm commits. */
  onPreviewRoad?: (roadId: RouteMapRoadId) => void;
  onConfirmRoad?: (roadId: RouteMapRoadId) => void;
  previewRoadId?: RouteMapRoadId | null;
  recommendedRoadId?: RouteMapRoadId | null;
  /** Services stage — tablet shows status, not a duplicate service chooser heading. */
  selectedServiceCount?: number;
  selectedRouteLabel?: string | null;
  /** Plan stage — Studio Plan summary on the tablet. */
  planModel?: ProjectBuilderStudioPlanSummaryModel | null;
  /**
   * ma-001 locked pack members in customer language (Flyer, Business card, …).
   * No producer IDs or renderer terminology.
   */
  ma001CompositionMemberLabels?: readonly string[] | null;
  onEditPlan?: () => void;
  onLooksGoodPlan?: () => void;
  onOpenPlanExtraDetails?: () => void;
  planBridgeError?: string | null;
  /** Live Intake tablet status — derived from answers, not static lists. */
  intakeTabletStatus?: {
    completed: readonly string[];
    stillNeeded: readonly string[];
    nextLine: string;
  } | null;
};

/** Mic privacy copy — rendered below the hardware, not inside the tablet. */
export const STUDIO_GUIDE_MIC_PRIVACY_NOTE =
  conversationRoomGuideV1.privacyNote;

/**
 * Guide content only — questions, bubbles, review, saved.
 * Speak / type lives in StudioGuideCommPanel beside the tablet.
 */
export default function StudioGuideTabletView({
  step,
  stage,
  draft,
  selectedBubbles,
  correcting,
  error,
  onToggleBubble,
  onContinue,
  onSkip,
  onConfirm,
  onCorrect,
  onCorrectTarget,
  onOpenStagePanel,
  onChangeRoute,
  onPreviewRoad,
  onConfirmRoad,
  previewRoadId = null,
  recommendedRoadId = null,
  selectedServiceCount = 0,
  selectedRouteLabel = null,
  planModel = null,
  ma001CompositionMemberLabels = null,
  onEditPlan,
  onLooksGoodPlan,
  onOpenPlanExtraDetails,
  planBridgeError = null,
  intakeTabletStatus = null,
}: StudioGuideTabletViewProps) {
  const v = conversationRoomGuideV1;
  const question = getConversationRoomGuideQuestion(step);
  const openingOwns = stage === "opening";
  const isAsk = openingOwns && Boolean(question) && !correcting;
  const isSummary = openingOwns && step === "summary";
  const isConfirmed = openingOwns && step === "confirmed";
  const isRouteStage = stage === "route";
  const isServicesStage = stage === "services";
  const isPlanStage = stage === "plan";
  const isCheckoutStage = stage === "checkout";
  const isIntakeStage = stage === "intake";
  const tabletOwnsChrome = isRouteStage || isPlanStage;

  return (
    <section
      className={styles.root}
      data-step={step}
      data-stage={stage}
      aria-label={v.eyebrow}
    >
      <div className={styles.main}>
        {isRouteStage && onPreviewRoad && onConfirmRoad ? (
          <ConversationRouteChoose
            onPreviewRoad={onPreviewRoad}
            onConfirmRoad={onConfirmRoad}
            previewRoadId={previewRoadId}
            recommendedRoadId={recommendedRoadId}
            compact
          />
        ) : null}

        {isPlanStage &&
        planModel &&
        onEditPlan &&
        onChangeRoute &&
        onLooksGoodPlan &&
        onOpenPlanExtraDetails ? (
          <ConversationStudioPlanTablet
            model={planModel}
            ma001CompositionMemberLabels={ma001CompositionMemberLabels}
            onEditPlan={onEditPlan}
            onChangeRoute={onChangeRoute}
            onLooksGood={onLooksGoodPlan}
            onOpenExtraDetails={onOpenPlanExtraDetails}
            bridgeError={planBridgeError}
          />
        ) : null}

        {!tabletOwnsChrome ? (
          <p className={styles.eyebrow}>{v.eyebrow}</p>
        ) : null}

        {isServicesStage ? (
          <>
            <h1 className={styles.question}>{v.servicesTabletTitle}</h1>
            <p className={styles.body}>{v.servicesPanelLead}</p>
            {selectedRouteLabel ? (
              <p className={styles.body}>
                Route: {selectedRouteLabel}. Services selected:{" "}
                {selectedServiceCount}.
              </p>
            ) : null}
            <div className={styles.actions}>
              {onOpenStagePanel ? (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={onOpenStagePanel}
                >
                  {v.servicesTabletOpenPanelCta}
                </button>
              ) : null}
              {onChangeRoute ? (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={onChangeRoute}
                >
                  {v.servicesChangeRouteCta}
                </button>
              ) : null}
            </div>
          </>
        ) : null}

        {isCheckoutStage ? (
          <>
            <h1 className={styles.question}>{v.checkoutTabletTitle}</h1>
            <p className={styles.body}>{v.checkoutTabletLead}</p>
            {planModel ? (
              <p className={styles.body}>
                {v.studioPlanRouteLabel}:{" "}
                {planModel.routeLabel.replace(/^[^·]+·\s*/, "")}.{" "}
                {v.studioPlanServicesLabel}: {planModel.deliverables.length}.{" "}
                {PROJECT_BUILDER_V1.totalLabel}: {planModel.totalDisplay}.
              </p>
            ) : null}
            <p className={styles.body}>{v.checkoutTaxesFeesNote}</p>
            {onOpenStagePanel ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={onOpenStagePanel}
                >
                  {v.checkoutOpenPanelCta}
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {isIntakeStage ? (
          <>
            <h1 className={styles.question}>{v.intakeTabletTitle}</h1>
            <p className={styles.body}>{v.intakeTabletLead}</p>

            <section className={styles.intakeStatus} aria-label="Project status">
              <h2 className={styles.intakeStatusHeading}>
                {v.intakeTabletCompletedHeading}
              </h2>
              <ul className={styles.intakeStatusList}>
                {(intakeTabletStatus?.completed ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h2 className={styles.intakeStatusHeading}>
                {v.intakeTabletStillNeededHeading}
              </h2>
              <ul className={styles.intakeStatusList}>
                {(intakeTabletStatus?.stillNeeded ?? [
                  v.intakeTabletStillNeededNoneLabel,
                ]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h2 className={styles.intakeStatusHeading}>
                {v.intakeTabletNextHeading}
              </h2>
              <p className={styles.body}>
                {intakeTabletStatus?.nextLine ??
                  v.intakeTabletNextRequiredRemaining}
              </p>
            </section>

            <p className={styles.hint}>{v.intakeLaterMaterialsTip}</p>

            {selectedServiceCount > 0 ? (
              <p className={styles.body}>
                Purchased services: {selectedServiceCount}.
              </p>
            ) : null}

            {onOpenStagePanel ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={onOpenStagePanel}
                >
                  {v.intakeOpenPanelCta}
                </button>
              </div>
            ) : null}
          </>
        ) : null}


        {isAsk && question ? (
          <>
            <div className={styles.questionHeader}>
              <h1 className={styles.question}>{question.question}</h1>
              {!question.canSkip || question.step === "ask_business_name" ? (
                <p className={styles.requiredBadge} aria-label="Required">
                  {v.answerRequiredLabel}
                </p>
              ) : null}
            </div>

            {question.bubbles.length > 0 ? (
              <div className={styles.chipRow} role="list">
                {question.bubbles.map((bubble) => {
                  const selected = selectedBubbles.includes(bubble);
                  return (
                    <button
                      key={bubble}
                      type="button"
                      role="listitem"
                      className={styles.chip}
                      data-selected={selected ? "true" : "false"}
                      aria-pressed={selected}
                      onClick={() => onToggleBubble(bubble)}
                    >
                      {bubble}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {shouldShowDeadlineFormatHint(selectedBubbles) ? (
              <p className={styles.hint}>{v.deadlineFormatHint}</p>
            ) : null}

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              {question.canSkip ? (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={onSkip}
                >
                  {v.skipLabel}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={onContinue}
              >
                {v.continueLabel}
              </button>
            </div>
          </>
        ) : null}

        {isSummary && !correcting ? (
          <>
            <h1 className={styles.question}>{v.summaryIntro}</h1>
            <SummaryCards draft={draft} />
            {draft.deadlineStatus === "unconfirmed" ? (
              <p className={styles.deadlineNote}>{v.deadlineUnconfirmedNote}</p>
            ) : null}
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={onCorrect}
              >
                {v.correctLabel}
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={onConfirm}
              >
                {v.confirmLabel}
              </button>
            </div>
          </>
        ) : null}

        {isSummary && correcting ? (
          <>
            <h1 className={styles.question}>{v.correctionPrompt}</h1>
            <div className={styles.chipRow} role="list">
              {v.correctionTargets.map((target) => (
                <button
                  key={target.step}
                  type="button"
                  role="listitem"
                  className={styles.chip}
                  onClick={() => onCorrectTarget(target.step)}
                >
                  {target.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {isConfirmed ? (
          <>
            <h1 className={styles.question}>{v.confirmedTitle}</h1>
            <p className={styles.savedBadge}>{v.confirmedSavedBadge}</p>
            <p className={styles.body}>{v.confirmedBody}</p>
            {draft.deadlineStatus === "unconfirmed" ? (
              <p className={styles.deadlineNote}>{v.deadlineUnconfirmedNote}</p>
            ) : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={onCorrect}
              >
                {v.correctLabel}
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={onConfirm}
              >
                {v.confirmLabel}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function SummaryCards({ draft }: { draft: GuideCaptureDraftV1 }) {
  const labels = conversationRoomGuideV1.fieldLabels;
  const skipped = "NA";
  const rows = [
    {
      label: labels.preferredName,
      value: draft.preferredName || skipped,
    },
    {
      label: labels.projectNeed,
      value: draft.projectNeed || skipped,
    },
    {
      label: labels.businessName,
      value: draft.businessName || skipped,
    },
    {
      label: labels.requestedDeadline,
      value: draft.requestedDeadline || "Not requested",
    },
    {
      label: labels.deadlineStatus,
      value: deadlineStatusLabel(draft.deadlineStatus),
    },
    {
      label: labels.existingMaterialsNote,
      value: draft.existingMaterialsNote || skipped,
    },
  ];

  return (
    <dl className={styles.summaryList}>
      {rows.map((row) => (
        <div key={row.label} className={styles.summaryRow}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
