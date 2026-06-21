"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import DraftIntakeConfirmation from "@/components/draft-room/DraftIntakeConfirmation";
import DraftIntakeForm from "@/components/draft-room/DraftIntakeForm";
import {
  draftRoom,
  DRAFT_INTAKE_REVIEW_STEP,
  deriveDraftIntakeLegacyFields,
  draftRoomClampPanelToViewport,
  draftRoomRectToCoverPercent,
  EMPTY_DRAFT_INTAKE_FORM,
  isDraftIntakeFormValid,
  type DraftIntakeFormValues,
} from "@/config/draft-room";
import { studioGuide, type StudioGuidePackageId } from "@/config/studio-guide";
import { submitDraftIntake } from "@/lib/draft-intake";

type Props = {
  packageId?: StudioGuidePackageId;
};

/** Draft Room intake — shared card shell for wizard steps and confirmation. */
export default function DraftRoomIntakeScene({ packageId }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [values, setValues] = useState<DraftIntakeFormValues>(EMPTY_DRAFT_INTAKE_FORM);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reviewingAfterSubmit, setReviewingAfterSubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { intakePlateNativeSize, intakeClipboardPaperRect } = draftRoom.layout;
  const { intakePlate } = draftRoom.assets;

  const packageBadge = packageId
    ? studioGuide.packages.find((pkg) => pkg.id === packageId)?.label
    : undefined;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const sync = () => {
      const { width, height } = stage.getBoundingClientRect();
      setStageSize({ width, height });
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(stage);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  const panelHeight = useMemo(() => {
    const base = draftRoomRectToCoverPercent(
      intakeClipboardPaperRect,
      stageSize,
      intakePlateNativeSize,
    );
    return draftRoomClampPanelToViewport(base, stageSize).height;
  }, [intakeClipboardPaperRect, stageSize, intakePlateNativeSize]);

  const handleReviewFromConfirmation = useCallback(() => {
    setConfirmed(false);
    setReviewingAfterSubmit(true);
    setSubmitError(null);
    setSubmitting(false);
    setStep(DRAFT_INTAKE_REVIEW_STEP);
  }, []);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!isDraftIntakeFormValid(values) || submitting) return;

      const resolvedPackageId = packageId ?? "momentum";
      const packageLabel =
        studioGuide.packages.find((pkg) => pkg.id === resolvedPackageId)?.label ??
        resolvedPackageId;

      setSubmitting(true);
      setSubmitError(null);

      try {
        await submitDraftIntake({
          ...values,
          ...deriveDraftIntakeLegacyFields(values),
          packageId: resolvedPackageId,
          packageLabel,
          submittedAt: new Date().toISOString(),
        });
        setReviewingAfterSubmit(false);
        setConfirmed(true);
      } catch {
        setSubmitError("Something went wrong saving your direction. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [packageId, submitting, values],
  );

  return (
    <div
      className={`dri dri--wizard draft-room${confirmed ? " dri--confirmed" : ""}`}
      aria-label="Draft Room intake"
    >
      <div
        ref={stageRef}
        className="dri-stage"
        style={{ "--dri-panel-height": panelHeight } as React.CSSProperties}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={intakePlate}
          alt=""
          width={intakePlateNativeSize.width}
          height={intakePlateNativeSize.height}
          className={`dri-art${confirmed ? " dri-art--scene" : " dri-art--wizard"}`}
          draggable={false}
        />

        {confirmed ? (
          <>
            <div className="dri-confirmation-scrim" aria-hidden="true" />
            <div
              className="dri-intake-float dri-confirmation-float"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dri-confirmation-title"
            >
              <DraftIntakeConfirmation
                packageId={packageId}
                onReviewAnswers={handleReviewFromConfirmation}
              />
            </div>
          </>
        ) : (
          <>
            <div className="dri-wizard-scrim" aria-hidden="true" />
            <div className="dri-intake-float">
              <div className="dri-intake-shell dri-wizard-panel">
                <DraftIntakeForm
                  values={values}
                  onChange={setValues}
                  onSubmit={onSubmit}
                  submitting={submitting}
                  valid={isDraftIntakeFormValid(values)}
                  packageBadge={packageBadge}
                  submitError={submitError}
                  step={step}
                  onStepChange={setStep}
                  reviewingAfterSubmit={reviewingAfterSubmit}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
