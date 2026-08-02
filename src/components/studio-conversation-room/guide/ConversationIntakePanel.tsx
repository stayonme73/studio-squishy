"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import ProjectIntakeMultiServiceForm from "@/components/studio-conversation-room/guide/ProjectIntakeMultiServiceForm";
import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { studioBoard } from "@/config/studio-board";
import { ROUTE_MAP_INTAKE_STEP_HREF } from "@/lib/intake-edit";
import {
  INTAKE_CONTINUITY_COPY,
  resolveIntakeEntrySurface,
  type IntakeEntrySurface,
} from "@/lib/route-map-intake-continuity";
import {
  intakeBusinessNameCarryForward,
  recordIntakeAnswerChanges,
} from "@/lib/conversation-room-draft";
import {
  saveRouteMapIntakeDraft,
  submitRouteMapIntake,
} from "@/lib/route-map-campaign";
import {
  isIntakeComplete,
  readCurrentCampaignHydrated,
} from "@/lib/studio-board-campaign";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "@/app/route-map/route-map.css";

export type ConversationIntakePanelProps = {
  onClose: () => void;
  onSubmitSuccess: () => void | Promise<void>;
  onRecoverPayment?: () => void;
  prefillBusinessName?: string | null;
  onAnswersChange?: (answers: RouteMapIntakeAnswers) => void;
  submitCtaLabel: string;
  nextStepBlurb: string;
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
}: ConversationIntakePanelProps) {
  const v = conversationRoomGuideV1;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<
    "unsaved" | "saved" | "error" | null
  >(null);
  const [gateOverride, setGateOverride] = useState<IntakeGate | null>(null);

  const [formSurface, setFormSurface] = useState(() =>
    gateOverride ?? resolveIntakeEntrySurface(readCurrentCampaignHydrated(), "intake"),
  );

  useEffect(() => {
    if (gateOverride) {
      setFormSurface(gateOverride);
      return;
    }
    setFormSurface(resolveIntakeEntrySurface(readCurrentCampaignHydrated(), "intake"));
  }, [gateOverride]);

  const surface = formSurface;

  const handleSaveDraft = useCallback(
    (answers: RouteMapIntakeAnswers) => {
      const current = readCurrentCampaignHydrated();
      if (isIntakeComplete(current) || !current?.paymentReceivedAt) {
        setDraftStatus("error");
        return false;
      }
      const previous = current.routeMapIntakeDraft?.answers ?? null;
      const updated = saveRouteMapIntakeDraft(answers);
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
    [prefillBusinessName],
  );

  const handleSubmit = useCallback(
    (answers: RouteMapIntakeAnswers): boolean => {
      setSubmitError(null);
      const current = readCurrentCampaignHydrated();
      if (isIntakeComplete(current)) {
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

      const previous = current.routeMapIntakeDraft?.answers ?? null;

      const updated = submitRouteMapIntake(answers);
      if (!updated) {
        setDraftStatus("error");
        setSubmitError(INTAKE_CONTINUITY_COPY.submitFailed);
        return false;
      }
      /* Only attribute after the campaign write succeeds — no false completion history. */
      recordIntakeAnswerChanges({
        previous,
        next: answers,
        carryForward: intakeBusinessNameCarryForward(prefillBusinessName),
      });
      onSubmitSuccess();
      return true;
    },
    [onSubmitSuccess, prefillBusinessName],
  );

  const draftLabel =
    draftStatus === "unsaved"
      ? "Unsaved draft"
      : draftStatus === "saved"
        ? "Progress saved"
        : null;

  if (!surface) {
    return (
      <div className={styles.sheet} data-panel="intake">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Conversation Room</p>
            <h2 className={styles.title}>{v.intakeTitle}</h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close activity panel"
          >
            Close
          </button>
        </header>
        <p className={styles.intro}>{INTAKE_CONTINUITY_COPY.missingContextLead}</p>
        <Link className={styles.backLink} href={ROUTE_MAP_INTAKE_STEP_HREF}>
          {v.intakeHostFallbackCta} →
        </Link>
      </div>
    );
  }

  if (surface.kind !== "form") {
    return (
      <div className={styles.sheet} data-panel="intake">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Conversation Room</p>
            <h2 className={styles.title}>{v.intakeTitle}</h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close activity panel"
          >
            Close
          </button>
        </header>
        <p className={styles.intro}>{gateTitle(surface)}</p>
        <p className={styles.intakeGateLead}>{gateLead(surface)}</p>
        {surface.kind === "missing-payment" && onRecoverPayment ? (
          <button
            type="button"
            className={styles.primary}
            onClick={onRecoverPayment}
          >
            {INTAKE_CONTINUITY_COPY.missingPaymentCta}
          </button>
        ) : null}
        {surface.kind === "already-submitted" ? (
          <Link className={styles.backLink} href={studioBoard.routes.studioBoard}>
            {INTAKE_CONTINUITY_COPY.alreadySubmittedCta} →
          </Link>
        ) : null}
        {surface.kind === "missing-plan" || surface.kind === "missing-context" ? (
          <Link className={styles.backLink} href={surface.recoveryHref}>
            {surface.recoveryLabel} →
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.sheet} data-panel="intake">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Conversation Room</p>
          <h2 className={styles.title}>{v.intakeTitle}</h2>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close activity panel"
        >
          Close
        </button>
      </header>

      <p className={styles.intro}>{v.intakeLead}</p>
      <p className={styles.checkoutScopeDisclosure} role="note">
        {v.intakeLaterMaterialsTip}
      </p>
      {draftLabel ? (
        <p className={styles.intakeDraftStatus} role="status" aria-live="polite">
          {draftLabel}
        </p>
      ) : null}

      <div
        className={`${styles.intakeHostSurface} ${utilityPageFontClassName}`}
      >
        <ProjectIntakeMultiServiceForm
          key={surface.selectedServiceIds.join("|")}
          selectedServiceIds={surface.selectedServiceIds}
          initialDraftAnswers={surface.draftAnswers}
          prefillBusinessName={prefillBusinessName}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
          onDraftStatusChange={setDraftStatus}
          onAnswersChange={onAnswersChange}
          submitError={submitError}
          submitCtaLabel={submitCtaLabel}
          nextStepBlurb={nextStepBlurb}
        />
      </div>
    </div>
  );
}
