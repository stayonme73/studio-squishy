"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import ConversationCheckoutPanel from "@/components/studio-conversation-room/guide/ConversationCheckoutPanel";
import ConversationIntakePanel from "@/components/studio-conversation-room/guide/ConversationIntakePanel";
import ConversationRouteChoose from "@/components/studio-conversation-room/guide/ConversationRouteChoose";
import ConversationServiceList from "@/components/studio-conversation-room/guide/ConversationServiceList";
import ConversationStudioPlanTablet, {
  ConversationStudioPlanActions,
} from "@/components/studio-conversation-room/guide/ConversationStudioPlanTablet";
import SamsungDeckBack from "@/components/studio-conversation-room/guide/SamsungDeckBack";
import SamsungDenimCta from "@/components/studio-conversation-room/guide/SamsungDenimCta";
import styles from "@/components/studio-conversation-room/guide/studio-guide-tablet.module.css";
import {
  CONVERSATION_ROOM_ACTIVE_QUESTION_HEADING_ID,
  CONVERSATION_ROOM_ACTIVE_QUESTION_ID,
  CONVERSATION_ROOM_ACTIVE_QUESTION_TOP_ID,
  revealActiveQuestionCluster,
  revealConversationStage,
} from "@/lib/studio-conversation-tablet-anchor";
import {
  conversationRoomGuideV1,
  getConversationRoomGuideQuestion,
  shouldShowDeadlineFormatHint,
} from "@/config/conversation-room-guide-v1";
import { studioTileClass } from "@/config/studio-customer-tile-system-v1";
import type { ConversationRoomStage } from "@/config/conversation-room-stage-v1";
import { PROJECT_BUILDER_V1 } from "@/config/project-builder-v1";
import type { GuideConversationStep } from "@/config/studio-guide-conversation-v1";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import {
  deadlineStatusLabel,
  type GuideCaptureDraftV1,
} from "@/lib/studio-guide-capture";
import type { ProjectBuilderStudioPlanSummaryModel } from "@/lib/project-builder-studio-plan-summary";
import { useSamsungActivate } from "@/lib/studio-samsung-activate";

function isPhoneServicesReady(input: {
  phoneLayout: boolean;
  isServicesStage: boolean;
  selectedRoadId: RouteMapRoadId | null;
  onAddJob?: (jobId: RouteMapJobId) => void;
  onRemoveJob?: (jobId: RouteMapJobId) => void;
  onReviewStudioPlan?: () => void;
  onChangeRoute?: () => void;
}): input is {
  phoneLayout: boolean;
  isServicesStage: boolean;
  selectedRoadId: RouteMapRoadId;
  onAddJob: (jobId: RouteMapJobId) => void;
  onRemoveJob: (jobId: RouteMapJobId) => void;
  onReviewStudioPlan: () => void;
  onChangeRoute: () => void;
} {
  return Boolean(
    input.phoneLayout &&
      input.isServicesStage &&
      input.selectedRoadId != null &&
      input.onAddJob != null &&
      input.onRemoveJob != null &&
      input.onReviewStudioPlan != null &&
      input.onChangeRoute != null,
  );
}

function isPhoneCheckoutReady(input: {
  phoneLayout: boolean;
  isCheckoutStage: boolean;
  selectedRoadId: RouteMapRoadId | null;
  onBackToStudioPlanFromCheckout?: () => void;
  onCheckoutPaymentComplete?: () => void | Promise<void>;
}): input is {
  phoneLayout: boolean;
  isCheckoutStage: boolean;
  selectedRoadId: RouteMapRoadId;
  onBackToStudioPlanFromCheckout: () => void;
  onCheckoutPaymentComplete: () => void | Promise<void>;
} {
  return Boolean(
    input.phoneLayout &&
      input.isCheckoutStage &&
      input.selectedRoadId != null &&
      input.onBackToStudioPlanFromCheckout != null &&
      input.onCheckoutPaymentComplete != null,
  );
}

function isPhoneIntakeReady(input: {
  phoneLayout: boolean;
  isIntakeStage: boolean;
  onIntakeSubmitSuccess?: () => void | Promise<void>;
  intakeSubmitCtaLabel?: string;
  intakeNextStepBlurb?: string;
}): input is {
  phoneLayout: boolean;
  isIntakeStage: boolean;
  onIntakeSubmitSuccess: () => void | Promise<void>;
  intakeSubmitCtaLabel: string;
  intakeNextStepBlurb: string;
} {
  return Boolean(
    input.phoneLayout &&
      input.isIntakeStage &&
      input.onIntakeSubmitSuccess != null &&
      input.intakeSubmitCtaLabel != null &&
      input.intakeNextStepBlurb != null,
  );
}

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
  selectedRoadId?: RouteMapRoadId | null;
  selectedJobIds?: ReadonlySet<RouteMapJobId>;
  routeGuidance?: string | null;
  /** Phone: dedicated Choose Your Services page, not a Conversation Room overlay. */
  phoneLayout?: boolean;
  onAddJob?: (jobId: RouteMapJobId) => void;
  onRemoveJob?: (jobId: RouteMapJobId) => void;
  onReviewStudioPlan?: () => void;
  onViewPlanScope?: (jobId: RouteMapJobId) => void;
  onBackToStudioPlanFromCheckout?: () => void;
  onCheckoutPaymentComplete?: () => void | Promise<void>;
  onSandboxCheckoutConfirm?: () => void | Promise<void>;
  onAuthorizeCheckoutPayment?: () => boolean;
  /** Phone: dedicated Project Intake page, not a Conversation Room overlay. */
  onIntakeSubmitSuccess?: () => void | Promise<void>;
  onRecoverIntakePayment?: () => void;
  intakePrefillBusinessName?: string | null;
  onIntakeAnswersChange?: (answers: RouteMapIntakeAnswers) => void;
  intakeSubmitCtaLabel?: string;
  intakeNextStepBlurb?: string;
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
  /** Paid condensed package name. Outranks a generic intake heading. */
  intakePackageName?: string | null;
  intakeTabletStatus?: {
    completed: readonly string[];
    stillNeeded: readonly string[];
    nextLine: string;
    paymentReceived: boolean;
    servicesConfirmed: boolean;
  } | null;
  /** Speak / type / Continue for the active opening question. */
  answerDock?: ReactNode;
  /** Free-form Ask is open. The dock asks a business question instead of the guide step. */
  askMode?: boolean;
  onAskQuestion?: () => void;
  onCloseAsk?: () => void;
  /** Compact Voice On / Off — already chosen, shown with the question. */
  modeControls?: ReactNode;
  /** Voice On parks the mic under the toggle. Voice Off parks typing in the dock. */
  voiceMode?: "on" | "off";
  /** Hide “Required” once a bubble or typed value is already captured. */
  answerAccepted?: boolean;
  /** Journey back through the reversible pre-checkout deck. */
  onDeckBack?: () => void;
  deckBackLabel?: string | null;
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
  selectedRoadId = null,
  selectedJobIds,
  phoneLayout = false,
  onAddJob,
  onRemoveJob,
  onReviewStudioPlan,
  onViewPlanScope,
  onBackToStudioPlanFromCheckout,
  onCheckoutPaymentComplete,
  onSandboxCheckoutConfirm,
  onAuthorizeCheckoutPayment,
  onIntakeSubmitSuccess,
  onRecoverIntakePayment,
  intakePrefillBusinessName = null,
  onIntakeAnswersChange,
  intakeSubmitCtaLabel,
  intakeNextStepBlurb,
  planModel = null,
  ma001CompositionMemberLabels = null,
  onEditPlan,
  onLooksGoodPlan,
  onOpenPlanExtraDetails,
  planBridgeError = null,
  intakePackageName = null,
  intakeTabletStatus = null,
  answerDock = null,
  askMode = false,
  onAskQuestion,
  onCloseAsk,
  modeControls = null,
  voiceMode = "off",
  answerAccepted: _answerAccepted = false,
  onDeckBack,
  deckBackLabel = null,
}: StudioGuideTabletViewProps) {
  const v = conversationRoomGuideV1;
  const question = getConversationRoomGuideQuestion(step);
  const openingOwns = stage === "opening";
  const isAsk = openingOwns && Boolean(question) && !correcting;
  const isSummary = openingOwns && (step === "summary" || step === "confirmed");
  const isRouteStage = stage === "route";
  const isServicesStage = stage === "services";
  const isPlanStage = stage === "plan";
  const isCheckoutStage = stage === "checkout";
  const isIntakeStage = stage === "intake";
  const servicesInput = {
    phoneLayout,
    isServicesStage,
    selectedRoadId,
    onAddJob,
    onRemoveJob,
    onReviewStudioPlan,
    onChangeRoute,
  };
  const servicesReady = isPhoneServicesReady(servicesInput) ? servicesInput : null;
  const checkoutInput = {
    phoneLayout,
    isCheckoutStage,
    selectedRoadId,
    onBackToStudioPlanFromCheckout,
    onCheckoutPaymentComplete,
  };
  const checkoutReady = isPhoneCheckoutReady(checkoutInput) ? checkoutInput : null;
  const intakeInput = {
    phoneLayout,
    isIntakeStage,
    onIntakeSubmitSuccess,
    intakeSubmitCtaLabel,
    intakeNextStepBlurb,
  };
  const intakeReady = isPhoneIntakeReady(intakeInput) ? intakeInput : null;
  const phoneServicesPage = servicesReady != null;
  const phoneCheckoutPage = checkoutReady != null;
  const phoneIntakePage = intakeReady != null;
  const tabletOwnsChrome =
    isRouteStage ||
    isPlanStage ||
    isServicesStage ||
    phoneCheckoutPage ||
    phoneIntakePage;
  const previousStepRef = useRef(step);
  const previousSurfaceRef = useRef(`${stage}:${step}`);

  useLayoutEffect(() => {
    const previous = previousStepRef.current;
    previousStepRef.current = step;
    if (!isAsk) return;
    if (previous === step) return;
    revealActiveQuestionCluster();
  }, [step, isAsk]);

  useLayoutEffect(() => {
    const key = `${stage}:${step}`;
    const previous = previousSurfaceRef.current;
    previousSurfaceRef.current = key;
    if (previous === key) return;
    if (isAsk) return;
    if (
      stage === "services" ||
      stage === "plan" ||
      stage === "checkout" ||
      stage === "intake"
    ) {
      return;
    }
    revealConversationStage();
  }, [stage, step, isAsk]);

  const summaryActions =
    isSummary && !correcting ? (
      <div
        className={styles.summaryOuterActions}
        data-summary-outer-actions="true"
      >
        <SamsungActionButton
          className={styles.btnCorrect}
          onActivate={onCorrect}
        >
          {v.correctLabel}
        </SamsungActionButton>
        <SamsungDenimCta onActivate={onConfirm}>
          {v.confirmLabel}
        </SamsungDenimCta>
      </div>
    ) : null;

  return (
    <>
    <section
      className={styles.root}
      data-step={step}
      data-stage={stage}
      data-surface="tablet"
      aria-label={v.eyebrow}
    >
      <div className={styles.main} data-question-scroll-root="true">
        {isRouteStage && onPreviewRoad && onConfirmRoad ? (
          <ConversationRouteChoose
            onPreviewRoad={onPreviewRoad}
            onConfirmRoad={onConfirmRoad}
            previewRoadId={previewRoadId}
            recommendedRoadId={recommendedRoadId}
            compact
            topControls={modeControls}
            onDeckBack={onDeckBack}
            deckBackLabel={deckBackLabel}
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
            onViewScope={onViewPlanScope}
            extrasInPlace={phoneLayout}
            hideActions={phoneLayout}
            topControls={modeControls}
            bridgeError={planBridgeError}
            onDeckBack={onDeckBack}
            deckBackLabel={deckBackLabel}
          />
        ) : null}

        {!tabletOwnsChrome ? (
          <p className={styles.eyebrow}>{v.eyebrow}</p>
        ) : null}

        {servicesReady ? (
          <ConversationServiceList
            phonePage
            roadId={servicesReady.selectedRoadId}
            selectedJobIds={selectedJobIds ?? new Set()}
            onClose={() => undefined}
            onBackToRoutes={servicesReady.onChangeRoute}
            onAddJob={servicesReady.onAddJob}
            onRemoveJob={servicesReady.onRemoveJob}
            onReviewStudioPlan={servicesReady.onReviewStudioPlan}
            topControls={modeControls}
          />
        ) : null}

        {isServicesStage && !phoneLayout ? (
          <>
            {onDeckBack && deckBackLabel ? (
              <SamsungDeckBack
                className={styles.deckBack}
                onActivate={onDeckBack}
              >
                ← {deckBackLabel}
              </SamsungDeckBack>
            ) : null}
            {modeControls}
            <p className={styles.eyebrow}>{v.eyebrow}</p>
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
                <SamsungDenimCta onActivate={onOpenStagePanel}>
                  {v.servicesTabletOpenPanelCta}
                </SamsungDenimCta>
              ) : null}
              {onChangeRoute ? (
                <SamsungActionButton
                  className={styles.btnSecondary}
                  onActivate={onChangeRoute}
                >
                  {v.servicesChangeRouteCta}
                </SamsungActionButton>
              ) : null}
            </div>
          </>
        ) : null}

        {checkoutReady ? (
          <ConversationCheckoutPanel
            phonePage
            roadId={checkoutReady.selectedRoadId}
            selectedJobIds={selectedJobIds ?? new Set()}
            onClose={() => undefined}
            onBackToStudioPlan={checkoutReady.onBackToStudioPlanFromCheckout}
            onPaymentComplete={checkoutReady.onCheckoutPaymentComplete}
            onSandboxConfirm={onSandboxCheckoutConfirm}
            onAuthorizePayment={onAuthorizeCheckoutPayment}
            paymentHonestyMessage={planBridgeError}
            topControls={modeControls}
          />
        ) : null}

        {isCheckoutStage && !phoneLayout ? (
          <>
            {onDeckBack && deckBackLabel ? (
              <SamsungDeckBack
                className={styles.deckBack}
                onActivate={onDeckBack}
              >
                ← {deckBackLabel}
              </SamsungDeckBack>
            ) : null}
            {modeControls}
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

        {intakeReady ? (
          <ConversationIntakePanel
            phonePage
            onClose={() => undefined}
            onSubmitSuccess={intakeReady.onIntakeSubmitSuccess}
            onRecoverPayment={onRecoverIntakePayment}
            prefillBusinessName={intakePrefillBusinessName}
            onAnswersChange={onIntakeAnswersChange}
            submitCtaLabel={intakeReady.intakeSubmitCtaLabel}
            nextStepBlurb={intakeReady.intakeNextStepBlurb}
            topControls={modeControls}
            onDeckBack={onDeckBack}
            deckBackLabel={deckBackLabel}
            paidAcknowledgment={[
              {
                label: v.intakeTabletPaymentReceivedLabel,
                confirmed: intakeTabletStatus?.paymentReceived ?? false,
              },
              {
                label: v.intakeTabletServicesConfirmedLabel,
                confirmed: intakeTabletStatus?.servicesConfirmed ?? false,
              },
            ]}
          />
        ) : null}

        {isIntakeStage && !phoneIntakePage ? (
          <>
            {onDeckBack && deckBackLabel ? (
              <SamsungDeckBack
                className={styles.deckBack}
                onActivate={onDeckBack}
              >
                ← {deckBackLabel}
              </SamsungDeckBack>
            ) : null}
            {modeControls}
            <h1 className={styles.question}>{intakePackageName || v.intakeTabletTitle}</h1>
            {intakePackageName ? (
              <p className={styles.body}>Project Intake</p>
            ) : null}
            <p className={styles.body}>{v.intakeTabletLead}</p>

            <section
              className={`${styles.intakeStatus} ${studioTileClass.standardDense}`}
              aria-label="Project status"
            >
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


        {askMode ? (
          <div className={styles.askCluster} data-freeform-ask="true">
            {modeControls}
            <button type="button" className={styles.deckBack} onClick={onCloseAsk}>
              ← Back to this question
            </button>
            <h1 className={styles.question}>Ask a question</h1>
            {answerDock}
            {error ? <p className={styles.error}>{error}</p> : null}
          </div>
        ) : isAsk && question ? (
          <>
          {onDeckBack && deckBackLabel ? (
            <SamsungDeckBack
              className={styles.deckBack}
              onActivate={onDeckBack}
            >
              ← {deckBackLabel}
            </SamsungDeckBack>
          ) : null}
          <div
            id={CONVERSATION_ROOM_ACTIVE_QUESTION_ID}
            className={styles.askCluster}
            data-active-question-cluster="true"
          >
            <div
              id={CONVERSATION_ROOM_ACTIVE_QUESTION_TOP_ID}
              data-question-reveal-top="true"
            >
              {modeControls}
              {voiceMode === "on" ? answerDock : null}
            </div>

            <p className={styles.requiredMeta} data-required-meta="true">
              {v.answerRequiredLabel}
            </p>

            <h1
              id={CONVERSATION_ROOM_ACTIVE_QUESTION_HEADING_ID}
              className={styles.question}
            >
              {renderGuideQuestionTitle(question)}
            </h1>

            {onAskQuestion ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.btnSecondary} ${styles.btnSkipNow}`}
                  onClick={onAskQuestion}
                >
                  Ask a question
                </button>
              </div>
            ) : null}

            {question.bubbles.length > 0 ? (
              <div className={styles.chipRow} role="list">
                {question.bubbles.map((bubble) => (
                  <SamsungChipButton
                    key={`${question.step}:${bubble}`}
                    label={bubble}
                    selected={selectedBubbles.includes(bubble)}
                    onActivate={() => onToggleBubble(bubble)}
                  />
                ))}
              </div>
            ) : answerDock ? null : (
              <p className={styles.hint}>{v.typedAnswerDockHint}</p>
            )}

            {shouldShowDeadlineFormatHint(selectedBubbles) ? (
              <p className={styles.hint}>{v.deadlineFormatHint}</p>
            ) : null}

            {error ? <p className={styles.error}>{error}</p> : null}

            {question.canSkip ? (
              <div className={styles.actions} data-skip-action="true">
                <SamsungActionButton
                  className={`${styles.btnSecondary} ${styles.btnSkipNow}`}
                  skipAction
                  onActivate={onSkip}
                >
                  {v.skipLabel}
                </SamsungActionButton>
              </div>
            ) : null}

            {!answerDock && question.bubbles.length > 0 ? (
              <div className={styles.actions}>
                <SamsungActionButton
                  className={styles.btnPrimary}
                  tabletContinue
                  onActivate={onContinue}
                >
                  {v.continueLabel}
                </SamsungActionButton>
              </div>
            ) : null}
          </div>
          <div
            className={styles.questionRevealPad}
            data-question-reveal-pad="true"
            aria-hidden="true"
          />
          </>
        ) : null}

        {isSummary && !correcting ? (
          <>
            {onDeckBack && deckBackLabel ? (
              <SamsungDeckBack
                className={styles.deckBack}
                onActivate={onDeckBack}
              >
                ← {deckBackLabel}
              </SamsungDeckBack>
            ) : null}
            {modeControls}
            <h1 className={styles.question}>
              <span className={styles.summaryLine}>{v.summaryIntroLead}</span>
              <span className={styles.summaryLine}>{v.summaryIntroAsk}</span>
            </h1>
            <SummaryCards draft={draft} />
            {draft.deadlineStatus === "unconfirmed" ? (
              <p className={styles.deadlineNote}>{v.deadlineUnconfirmedNote}</p>
            ) : null}
            {error ? <p className={styles.error}>{error}</p> : null}
          </>
        ) : null}

        {isSummary && correcting ? (
          <>
            <h1 className={styles.question}>{v.correctionPrompt}</h1>
            <div className={styles.chipRow} role="list">
              {v.correctionTargets.map((target) => (
                <SamsungChipButton
                  key={target.step}
                  label={target.label}
                  onActivate={() => onCorrectTarget(target.step)}
                />
              ))}
            </div>
          </>
        ) : null}

      </div>
      {answerDock && voiceMode !== "on" ? (
        <div className={styles.answerDock} data-answer-dock="pinned">
          {answerDock}
        </div>
      ) : null}
    </section>
    {summaryActions}
    {isPlanStage &&
    phoneLayout &&
    planModel &&
    onEditPlan &&
    onChangeRoute &&
    onLooksGoodPlan ? (
      <ConversationStudioPlanActions
        extrasInPlace
        canContinue={planModel.canContinue}
        onEditPlan={onEditPlan}
        onChangeRoute={onChangeRoute}
        onLooksGood={onLooksGoodPlan}
      />
    ) : null}
    </>
  );
}

function renderGuideQuestionTitle(question: {
  step: GuideConversationStep;
  question: string;
}) {
  if (question.step !== "ask_business_name") return question.question;
  const pivot = "your ";
  const at = question.question.toLowerCase().lastIndexOf(pivot);
  if (at < 0) return question.question;
  const lead = question.question.slice(0, at + pivot.length).trimEnd();
  return (
    <>
      <span className={styles.titleLead}>{lead}</span>
      <br />
      {question.question.slice(at + pivot.length)}
    </>
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

function SamsungChipButton({
  label,
  selected,
  onActivate,
}: {
  label: string;
  selected?: boolean;
  onActivate: () => void;
}) {
  const activate = useSamsungActivate<HTMLButtonElement>(onActivate);
  return (
    <button
      ref={activate.ref}
      type="button"
      role="listitem"
      className={styles.chip}
      data-selected={selected === undefined ? undefined : selected ? "true" : "false"}
      aria-pressed={selected === undefined ? undefined : selected}
      onClick={activate.onClick}
    >
      {label}
    </button>
  );
}

function SamsungActionButton({
  className,
  children,
  onActivate,
  tabletContinue,
  skipAction,
}: {
  className: string;
  children: ReactNode;
  onActivate: () => void;
  tabletContinue?: boolean;
  skipAction?: boolean;
}) {
  const activate = useSamsungActivate<HTMLButtonElement>(
    onActivate,
    tabletContinue ? { consumeGesture: true } : undefined,
  );
  return (
    <button
      ref={activate.ref}
      type="button"
      className={className}
      data-tablet-continue={tabletContinue ? "true" : undefined}
      data-skip-action={skipAction ? "true" : undefined}
      onClick={activate.onClick}
    >
      {children}
    </button>
  );
}
