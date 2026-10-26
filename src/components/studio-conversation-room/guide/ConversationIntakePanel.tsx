"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import ProjectIntakeMultiServiceForm from "@/components/studio-conversation-room/guide/ProjectIntakeMultiServiceForm";
import SamsungDeckBack from "@/components/studio-conversation-room/guide/SamsungDeckBack";
import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import {
  condensedIntakeWelcomeFor,
} from "@/config/studio-customer-journey-condense-v1";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { studioBoard } from "@/config/studio-board";
import { ROUTE_MAP_INTAKE_STEP_HREF } from "@/lib/intake-edit";
import {
  INTAKE_CONTINUITY_COPY,
  resolveIntakeEntrySurface,
  type IntakeEntrySurface,
} from "@/lib/route-map-intake-continuity";
import { FLYER_PRODUCTION_INTAKE_ANSWER_KEYS } from "@/lib/project-intake-flyer-production";
import {
  ensureConversationIntakeCampaign,
  intakeBusinessNameCarryForward,
  recordIntakeAnswerChanges,
} from "@/lib/conversation-room-draft";
import {
  saveRouteMapIntakeDraft,
  submitRouteMapIntake,
  mergeSubmittedFlyerIntakeCorrection,
  saveSubmittedFlyerIntakeCorrectionDraft,
} from "@/lib/route-map-campaign";
import {
  isIntakeComplete,
  readCurrentCampaignHydrated,
} from "@/lib/studio-board-campaign";
import { buildCondensedOfferIntakePlan } from "@/lib/project-intake-plan";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import { resetConversationStageScroll } from "@/lib/studio-conversation-stage-scroll";

import "@/app/route-map/route-map.css";
import "@/app/studio-visual-system-v2.css";

export type ConversationIntakePanelProps = {
  onClose: () => void;
  onSubmitSuccess: () => void | Promise<void>;
  onRecoverPayment?: () => void;
  prefillBusinessName?: string | null;
  onAnswersChange?: (answers: RouteMapIntakeAnswers) => void;
  submitCtaLabel: string;
  nextStepBlurb: string;
  /** Mobile dedicated page — not an overlay on Conversation Room. */
  phonePage?: boolean;
  /** Payment received / services confirmed — shown once on the phone page. */
  paidAcknowledgment?: readonly {
    label: string;
    confirmed: boolean;
  }[];
  topControls?: ReactNode;
  onDeckBack?: () => void;
  deckBackLabel?: string | null;
  /** Local look only. Saves into the working draft. Does not open Studio Board or take payment. */
  lookOnly?: boolean;
  lookSurface?: Extract<IntakeEntrySurface, { kind: "form" }>;
  /** Unpaid preview save. Return false when the draft could not be written. */
  onPreviewAnswers?: (answers: RouteMapIntakeAnswers) => boolean;
};

type IntakeGate = Exclude<IntakeEntrySurface, { kind: "form" }>;

function gateTitle(surface: IntakeGate): string {
  switch (surface.kind) {
    case "already-submitted":
      return INTAKE_CONTINUITY_COPY.alreadySubmittedTitle;
    case "missing-payment":
      return INTAKE_CONTINUITY_COPY.missingPaymentTitle;
    case "missing-plan":
      return INTAKE_CONTINUITY_COPY.missingPlanTitle;
    case "missing-context":
      return INTAKE_CONTINUITY_COPY.missingContextTitle;
  }
}

function gateLead(surface: IntakeGate): string {
  switch (surface.kind) {
    case "already-submitted":
      return INTAKE_CONTINUITY_COPY.alreadySubmittedLead;
    case "missing-payment":
      return INTAKE_CONTINUITY_COPY.missingPaymentLead;
    case "missing-plan":
      return INTAKE_CONTINUITY_COPY.missingPlanLead;
    case "missing-context":
      return INTAKE_CONTINUITY_COPY.missingContextLead;
  }
}

/**
 * Activity Panel Project Intake — multi-service cards (shared + per service).
 * Legacy intake URLs redirect here for current customer certification.
 */
export default function ConversationIntakePanel({
  onClose,
  onSubmitSuccess,
  onRecoverPayment,
  prefillBusinessName = null,
  onAnswersChange,
  submitCtaLabel,
  nextStepBlurb,
  phonePage = false,
  paidAcknowledgment = [],
  topControls = null,
  onDeckBack,
  deckBackLabel = null,
  lookOnly = false,
  lookSurface,
  onPreviewAnswers,
}: ConversationIntakePanelProps) {
  const v = conversationRoomGuideV1;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<
    "unsaved" | "saved" | "error" | null
  >(null);
  const [previewNote, setPreviewNote] = useState<string | null>(null);
  const [gateOverride, setGateOverride] = useState<IntakeGate | null>(null);

  const [formSurface, setFormSurface] = useState(() =>
    lookSurface ??
      gateOverride ??
      resolveIntakeEntrySurface(
        ensureConversationIntakeCampaign() ?? readCurrentCampaignHydrated(),
        "intake",
      ),
  );

  useEffect(() => {
    if (lookSurface) {
      setFormSurface(lookSurface);
      return;
    }
    if (gateOverride) {
      setFormSurface(gateOverride);
      return;
    }
    const refresh = () => {
      setFormSurface(
        resolveIntakeEntrySurface(
          ensureConversationIntakeCampaign() ?? readCurrentCampaignHydrated(),
          "intake",
        ),
      );
    };
    refresh();
    window.addEventListener("studio-squishy:campaign-updated", refresh);
    return () => {
      window.removeEventListener("studio-squishy:campaign-updated", refresh);
    };
  }, [gateOverride, lookSurface]);

  useEffect(() => {
    if (phonePage) {
      resetConversationStageScroll();
    }
  }, [phonePage]);

  const surface = formSurface;
  const journeyWelcome =
    lookOnly &&
    phonePage &&
    surface?.kind === "form" &&
    surface.condensedPackageId &&
    !surface.flyerProductionCorrection
      ? condensedIntakeWelcomeFor(surface.condensedPackageId)
      : null;

  const handleSaveDraft = useCallback(
    (answers: RouteMapIntakeAnswers) => {
      if (lookOnly) return true;
      const current = readCurrentCampaignHydrated();
      const correction = surface?.kind === "form" && surface.flyerProductionCorrection;
      if (!correction && (isIntakeComplete(current) || !current?.paymentReceivedAt)) {
        setDraftStatus("error");
        return false;
      }
      const previous = current?.routeMapIntakeDraft?.answers ?? null;
      const updated = correction
        ? saveSubmittedFlyerIntakeCorrectionDraft(answers)
        : saveRouteMapIntakeDraft(answers);
      if (!updated) {
        setDraftStatus("error");
        return false;
      }
      /* Campaign stays the answer store; working-draft history records attribution only. */
      recordIntakeAnswerChanges({
        previous,
        next: answers,
        carryForward: intakeBusinessNameCarryForward(prefillBusinessName),
      });
      setDraftStatus("saved");
      return true;
    },
    [lookOnly, prefillBusinessName, surface],
  );

  const handleSubmit = useCallback(
    async (answers: RouteMapIntakeAnswers): Promise<boolean> => {
      setSubmitError(null);
      if (lookOnly) {
        const saved = onPreviewAnswers?.(answers) ?? true;
        if (saved) {
          setSubmitError(null);
          setDraftStatus("saved");
          setPreviewNote("Your answers are saved. Studio Board opens after payment.");
        } else {
          setPreviewNote(null);
          setDraftStatus("error");
          setSubmitError("Those answers could not be saved. They are still on this page.");
        }
        return false;
      }
      const current = readCurrentCampaignHydrated();
      const correction = surface?.kind === "form" && surface.flyerProductionCorrection;
      if (!correction && isIntakeComplete(current)) {
        setGateOverride({ kind: "already-submitted" });
        return false;
      }
      if (!current?.paymentReceivedAt) {
        setGateOverride({ kind: "missing-payment" });
        return false;
      }
      if (!current.approvedStudioPlan) {
        const resolved = resolveIntakeEntrySurface(current, "intake");
        if (resolved && resolved.kind !== "form") {
          setGateOverride(resolved);
        } else {
          setGateOverride({
            kind: "missing-plan",
            recoveryHref: studioBoard.routes.newCampaign,
            recoveryLabel: "Return to Conversation Room",
          });
        }
        return false;
      }

      const previous =
        (correction ? current.routeMapIntake?.answers : current.routeMapIntakeDraft?.answers) ??
        null;

      if (correction) {
        mergeSubmittedFlyerIntakeCorrection(answers);
        const response = await fetch(
          `/api/campaigns/${current.campaignId}/flyer-intake-correction`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers }),
          },
        );
        if (!response.ok) {
          setDraftStatus("error");
          setSubmitError(INTAKE_CONTINUITY_COPY.submitFailed);
          return false;
        }
        recordIntakeAnswerChanges({
          previous,
          next: answers,
          carryForward: intakeBusinessNameCarryForward(prefillBusinessName),
        });
        await onSubmitSuccess();
        return true;
      }

      const submittedAt = new Date().toISOString();
      const checkoutSessionId = current.paymentTruth?.checkoutSessionId;
      if (!checkoutSessionId) {
        setDraftStatus("error");
        setSubmitError(INTAKE_CONTINUITY_COPY.submitFailed);
        return false;
      }
      const persist = await fetch("/api/payments/intake-submit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutSessionId,
          answers,
          submittedAt,
        }),
      });
      if (!persist.ok) {
        setDraftStatus("error");
        setSubmitError(INTAKE_CONTINUITY_COPY.submitFailed);
        return false;
      }
      const updated = submitRouteMapIntake(answers, submittedAt);
      if (!updated) {
        setDraftStatus("error");
        setSubmitError(INTAKE_CONTINUITY_COPY.submitFailed);
        return false;
      }
      recordIntakeAnswerChanges({
        previous,
        next: answers,
        carryForward: intakeBusinessNameCarryForward(prefillBusinessName),
      });
      await onSubmitSuccess();
      return true;
    },
    [lookOnly, onPreviewAnswers, onSubmitSuccess, prefillBusinessName, surface],
  );

  const draftLabel =
    draftStatus === "unsaved"
      ? "Unsaved draft"
      : draftStatus === "saved"
        ? "Progress saved"
        : null;

  const journeyChrome =
    topControls || (onDeckBack && deckBackLabel) ? (
      <div data-tablet-journey-chrome="true">
        {onDeckBack && deckBackLabel ? (
          <SamsungDeckBack className={styles.backLink} onActivate={onDeckBack}>
            ← {deckBackLabel}
          </SamsungDeckBack>
        ) : null}
        {topControls}
      </div>
    ) : null;

  const intakeHeader = (
    <>
    {journeyChrome}
    <header className={styles.header}>
      <div>
        {journeyWelcome ? (
          <>
            <p className="studio-homepage__kicker">{journeyWelcome.eyebrow}</p>
            <h1 className="studio-homepage__section-title">{journeyWelcome.title}</h1>
          </>
        ) : (
          <>
            {phonePage ? null : (
              <p className={styles.eyebrow}>Conversation Room</p>
            )}
            <h2 className={styles.title}>
              {surface?.kind === "form" && surface.flyerProductionCorrection
                ? INTAKE_CONTINUITY_COPY.flyerCorrectionTitle
                : v.intakeTitle}
            </h2>
          </>
        )}
      </div>
      {phonePage ? null : (
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close activity panel"
        >
          Close
        </button>
      )}
    </header>
    </>
  );

  const paidAck = null;
  void paidAcknowledgment;

  if (!surface) {
    return (
      <div
        className={styles.sheet}
        data-panel="intake"
        data-surface={phonePage ? "page" : "overlay"}
      >
        {intakeHeader}
        {paidAck}
        <p className={styles.intro}>{INTAKE_CONTINUITY_COPY.missingContextLead}</p>
        {onDeckBack ? (
          <SamsungDeckBack className={styles.backLink} onActivate={onDeckBack}>
            ← {deckBackLabel ?? v.studioPlanBackLabel}
          </SamsungDeckBack>
        ) : onRecoverPayment ? (
          <button
            type="button"
            className={styles.primary}
            onClick={onRecoverPayment}
          >
            {INTAKE_CONTINUITY_COPY.missingPaymentCta}
          </button>
        ) : (
          <Link className={styles.backLink} href={ROUTE_MAP_INTAKE_STEP_HREF}>
            {v.intakeHostFallbackCta} →
          </Link>
        )}
      </div>
    );
  }

  if (surface.kind !== "form") {
    return (
      <div
        className={styles.sheet}
        data-panel="intake"
        data-surface={phonePage ? "page" : "overlay"}
      >
        {intakeHeader}
        {paidAck}
        <p className={styles.intro}>{gateTitle(surface)}</p>
        <p className={styles.intakeGateLead}>{gateLead(surface)}</p>
        {surface.kind === "missing-payment" ? (
          onRecoverPayment ? (
            <button
              type="button"
              className={styles.primary}
              onClick={onRecoverPayment}
            >
              {INTAKE_CONTINUITY_COPY.missingPaymentCta}
            </button>
          ) : (
            <Link className={styles.backLink} href="/studio-conversation-room?stage=checkout">
              {INTAKE_CONTINUITY_COPY.missingPaymentCta} →
            </Link>
          )
        ) : null}
        {surface.kind === "already-submitted" ? (
          <Link className={styles.backLink} href={studioBoard.routes.studioBoard}>
            {INTAKE_CONTINUITY_COPY.alreadySubmittedCta} →
          </Link>
        ) : null}
        {surface.kind === "missing-plan" || surface.kind === "missing-context" ? (
          onDeckBack ? (
            <SamsungDeckBack className={styles.backLink} onActivate={onDeckBack}>
              ← {deckBackLabel ?? surface.recoveryLabel}
            </SamsungDeckBack>
          ) : onRecoverPayment && surface.kind === "missing-context" ? (
            <button
              type="button"
              className={styles.primary}
              onClick={onRecoverPayment}
            >
              {INTAKE_CONTINUITY_COPY.missingPaymentCta}
            </button>
          ) : (
            <Link className={styles.backLink} href={surface.recoveryHref}>
              {surface.recoveryLabel} →
            </Link>
          )
        ) : null}
      </div>
    );
  }

  const legacyCatalogIntake =
    surface.kind === "form" &&
    !surface.condensedPackageId &&
    !surface.flyerProductionCorrection;

  if (legacyCatalogIntake) {
    return (
      <div
        className={styles.sheet}
        data-panel="intake"
        data-surface={phonePage ? "page" : "overlay"}
        data-intake-buried="legacy-catalog"
      >
        {intakeHeader}
        <p className={styles.intro}>
          This older Project Intake is set aside for the current walk. It stays in the project until the screen-by-screen review is finished, and then it comes off.
        </p>
        <p className={styles.intro}>
          Social & Promo Graphics already asks for the offer or theme, the facts and disclosures, your logo and photos if you have them, a call to action if you have one, and permission to use the materials. You answer those on Build Your Project. The files are added in My Studio.
        </p>
        <p className={styles.intro}>
          The older page also asked you to pick one platform. The current package does not. It includes 4 square posts, matching captions, and two campaign graphics. You post them.
        </p>
        <Link className={styles.backLink} href="/project-builder?package=social_and_promo_graphics">
          Open Social & Promo Graphics
        </Link>
      </div>
    );
  }

  return (
    <div
      className={styles.sheet}
      data-panel="intake"
      data-surface={phonePage ? "page" : "overlay"}
    >
      {intakeHeader}
      {paidAck}

      <p
        className={
          journeyWelcome &&
          surface.clipAskOnce?.kind !== "saved" &&
          surface.clipAskOnce?.kind !== "missing-confirmation"
            ? "studio-homepage__card-detail"
            : styles.intro
        }
      >
        {journeyWelcome &&
        surface.clipAskOnce?.kind !== "saved" &&
        surface.clipAskOnce?.kind !== "missing-confirmation"
          ? journeyWelcome.lead
          : surface.clipAskOnce?.kind === "saved"
          ? surface.clipAskOnce.lead
          : surface.clipAskOnce?.kind === "missing-confirmation"
            ? surface.clipAskOnce.lead
            : surface.clipAskOnce?.kind === "gaps"
              ? surface.clipAskOnce.lead ??
                "One saved answer is still missing. The other answers stay as you left them."
          : surface.flyerProductionCorrection
            ? INTAKE_CONTINUITY_COPY.flyerCorrectionLead
            : surface.condensedPackageName
              ? `Payment is complete for ${surface.condensedPackageName}. Answer these questions for that package. You add the actual files in My Studio after this form.`
              : v.intakeLead}
      </p>
      {surface.flyerProductionCorrection || surface.clipAskOnce ? null : (
        <p className={styles.checkoutScopeDisclosure} role="note">
          {v.intakeLaterMaterialsTip}
        </p>
      )}
      {draftLabel ? (
        <p className={styles.intakeDraftStatus} role="status" aria-live="polite">
          {draftLabel}
        </p>
      ) : null}

      {surface.clipAskOnce?.kind === "saved" && !lookOnly ? (
        <Link className={styles.backLink} href={`${studioBoard.routes.studioBoard}#sb-materials`}>
          {surface.clipAskOnce.action} →
        </Link>
      ) : surface.clipAskOnce?.kind === "missing-confirmation" ? (
        <Link className={styles.backLink} href={studioBoard.routes.studioBoard}>
          Return to My Studio →
        </Link>
      ) : (
      <div
        className={`${styles.intakeHostSurface} ${utilityPageFontClassName}`}
      >
        <ProjectIntakeMultiServiceForm
          key={`${surface.condensedPackageId ?? surface.selectedServiceIds.join("|")}:${surface.flyerProductionCorrection ? "flyer-fix" : "full"}`}
          selectedServiceIds={surface.selectedServiceIds}
          intakePlan={
            surface.condensedPackageId
              ? buildCondensedOfferIntakePlan({
                  packageId: surface.condensedPackageId,
                  name: surface.condensedPackageName ?? surface.condensedPackageId,
                })
              : null
          }
          initialDraftAnswers={surface.draftAnswers}
          prefillBusinessName={prefillBusinessName}
          onSaveDraft={
            lookOnly
              ? (answers) => onPreviewAnswers?.(answers) ?? true
              : handleSaveDraft
          }
          onSubmit={handleSubmit}
          onDraftStatusChange={setDraftStatus}
          onAnswersChange={onAnswersChange}
          submitError={submitError}
          statusNote={previewNote}
          submitCtaLabel={submitCtaLabel}
          nextStepBlurb={nextStepBlurb}
          phoneLayout={phonePage}
          visibleAnswerKeys={
            surface.flyerProductionCorrection
              ? FLYER_PRODUCTION_INTAKE_ANSWER_KEYS
              : surface.clipAskOnce?.kind === "gaps"
                ? surface.clipAskOnce.keys
                : null
          }
          optionalAnswerKeys={
            surface.clipAskOnce?.kind === "gaps" ? surface.clipAskOnce.optionalKeys : null
          }
        />
      </div>
      )}
    </div>
  );
}
