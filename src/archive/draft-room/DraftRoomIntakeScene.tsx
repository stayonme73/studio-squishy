"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import DraftIntakeConfirmation from "@/archive/draft-room/DraftIntakeConfirmation";
import DraftIntakeForm from "@/archive/draft-room/DraftIntakeForm";
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
import { studioBoard } from "@/config/studio-board";
import { resolveVisionData } from "@/lib/campaign-record";
import { submitDraftIntake } from "@/lib/draft-intake";
import { isIntakeEditable } from "@/lib/intake-edit";
import { IntakeLockedError, readCurrentCampaignHydrated } from "@/lib/studio-board-campaign";

type Props = {
  packageId?: StudioGuidePackageId;
  editMode?: boolean;
};

/** Draft Room intake — shared card shell for wizard steps and confirmation. */
export default function DraftRoomIntakeScene({ packageId, editMode = false }: Props) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [values, setValues] = useState<DraftIntakeFormValues>(EMPTY_DRAFT_INTAKE_FORM);
  const [step, setStep] = useState(editMode ? DRAFT_INTAKE_REVIEW_STEP : 0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reviewingAfterSubmit, setReviewingAfterSubmit] = useState(editMode);
  const [readOnlyReview, setReadOnlyReview] = useState(false);
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

  const isMobileViewport = stageSize.width > 0 && stageSize.width <= 1024;
  const stageStyle = isMobileViewport
    ? undefined
    : ({ "--dri-panel-height": panelHeight } as React.CSSProperties);

  useEffect(() => {
    const campaign = readCurrentCampaignHydrated();
    if (!campaign) return;

    if (editMode && !isIntakeEditable(campaign.campaignStatus)) {
      router.replace(studioBoard.routes.studioBoard);
      return;
    }

    const vision = resolveVisionData(campaign);
    if (vision) {
      setValues(vision);
    }
  }, [editMode, router]);

  const handleViewFromConfirmation = useCallback(() => {
    setConfirmed(false);
    setReviewingAfterSubmit(true);
    setReadOnlyReview(true);
    setSubmitError(null);
    setSubmitting(false);
    setStep(DRAFT_INTAKE_REVIEW_STEP);
  }, []);

  const handleEditFromConfirmation = useCallback(() => {
    setConfirmed(false);
    setReviewingAfterSubmit(true);
    setReadOnlyReview(false);
    setSubmitError(null);
    setSubmitting(false);
    setStep(DRAFT_INTAKE_REVIEW_STEP);
  }, []);

  const handleReturnToConfirmation = useCallback(() => {
    setReviewingAfterSubmit(false);
    setReadOnlyReview(false);
    setConfirmed(true);
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
        setReadOnlyReview(false);
        setConfirmed(true);
      } catch (error) {
        if (error instanceof IntakeLockedError) {
          router.replace(studioBoard.routes.studioBoard);
        } else {
          setSubmitError("Something went wrong saving your direction. Please try again.");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [packageId, router, submitting, values],
  );

  return (
    <div
      className={`dri dri--wizard draft-room${confirmed ? " dri--confirmed" : ""}`}
      aria-label="Draft Room intake"
    >
      <div
        ref={stageRef}
        className="dri-stage"
        style={stageStyle}
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
                onViewBrief={handleViewFromConfirmation}
                onEditBrief={handleEditFromConfirmation}
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
                  readOnlyReview={readOnlyReview}
                  onReturnToConfirmation={reviewingAfterSubmit && readOnlyReview ? handleReturnToConfirmation : undefined}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
