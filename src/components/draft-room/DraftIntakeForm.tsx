"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import DraftIntakeAnswerSummary from "@/components/draft-room/DraftIntakeAnswerSummary";
import IntakeVisionAccents from "@/components/draft-room/IntakeVisionAccents";
import {
  draftRoom,
  DRAFT_INTAKE_REVIEW_STEP,
  formatProjectValue,
  isDraftIntakeStepValid,
  type DraftIntakeFormValues,
  type DraftIntakeProjectStarterId,
} from "@/config/draft-room";
import { intakeDesignSystem } from "@/config/intake-design-system";

type Props = {
  values: DraftIntakeFormValues;
  onChange: (values: DraftIntakeFormValues) => void;
  onSubmit: (event: React.FormEvent) => void;
  submitting: boolean;
  valid: boolean;
  packageBadge?: string;
  step?: number;
  onStepChange?: (step: number) => void;
  submitError?: string | null;
  reviewingAfterSubmit?: boolean;
};

function OptionalLabel() {
  return <span className="dri-optional"> (Optional)</span>;
}

function StudioNoteSpark() {
  return (
    <svg className="dri-studio-note-spark" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M8 2.5v11M4.5 8h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function toggleChip<T extends string>(selected: readonly T[], id: T): T[] {
  return selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
}

function labelForStarter(
  options: readonly { id: string; label: string }[],
  id: string,
) {
  return options.find((option) => option.id === id)?.label ?? id;
}

type FieldSize = "business" | "compact" | "color-list" | "notes" | "references" | "other";

type TextFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  fieldSize?: FieldSize;
  showLabel?: boolean;
  optional?: boolean;
  onChange: (value: string) => void;
};

const fieldRows: Record<FieldSize, number> = {
  business: 3,
  compact: 2,
  "color-list": 3,
  notes: 2,
  references: 3,
  other: 4,
};

function TextField({
  label,
  value,
  placeholder,
  fieldSize = "compact",
  showLabel = false,
  optional = false,
  onChange,
}: TextFieldProps) {
  return (
    <label className={`dri-field dri-field--${fieldSize}`}>
      <span className={showLabel ? "dri-field-label" : "sr-only"}>
        {label}
        {optional ? <OptionalLabel /> : null}
      </span>
      <textarea
        className="dri-textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={fieldRows[fieldSize]}
      />
    </label>
  );
}

type ProjectPickerProps = {
  starter: DraftIntakeProjectStarterId | "";
  detail: string;
  chipHint: string;
  detailPlaceholder: string;
  otherPlaceholder: string;
  chips: readonly { id: DraftIntakeProjectStarterId; label: string }[];
  onChange: (patch: Pick<DraftIntakeFormValues, "projectStarter" | "projectDetail" | "project">) => void;
};

function ProjectPicker({
  starter,
  detail,
  chipHint,
  detailPlaceholder,
  otherPlaceholder,
  chips,
  onChange,
}: ProjectPickerProps) {
  const starterLabel = starter ? labelForStarter(chips, starter) : "";

  const selectStarter = (id: DraftIntakeProjectStarterId) => {
    if (starter === id) {
      onChange({ projectStarter: "", projectDetail: "", project: "" });
      return;
    }
    if (id === "other") {
      onChange({ projectStarter: id, projectDetail: "", project: "" });
      return;
    }
    onChange({
      projectStarter: id,
      projectDetail: "",
      project: formatProjectValue(id, ""),
    });
  };

  const updateDetail = (nextDetail: string) => {
    if (!starter) return;
    onChange({
      projectStarter: starter,
      projectDetail: nextDetail,
      project: formatProjectValue(starter, nextDetail),
    });
  };

  return (
    <div className="dri-project-picker">
      <p className="dri-chip-hint">{chipHint}</p>
      <ChipSingle
        options={chips}
        selected={starter}
        onSelect={selectStarter}
        groupLabel={chipHint}
      />
      {starter && starter !== "other" ? (
        <label className="dri-project-detail">
          <span className="dri-project-detail__prefix">{starterLabel}:</span>
          <input
            type="text"
            className="dri-inline-input"
            value={detail}
            placeholder={detailPlaceholder}
            onChange={(event) => updateDetail(event.target.value)}
          />
        </label>
      ) : null}
      {starter === "other" ? (
        <TextField
          label="Describe your project"
          value={detail}
          placeholder={otherPlaceholder}
          fieldSize="other"
          onChange={updateDetail}
        />
      ) : null}
    </div>
  );
}

type ChipMultiProps<T extends string> = {
  options: readonly { id: T; label: string }[];
  selected: readonly T[];
  onToggle: (id: T) => void;
  groupLabel: string;
};

function ChipMulti<T extends string>({ options, selected, onToggle, groupLabel }: ChipMultiProps<T>) {
  return (
    <div className="dri-chips" role="group" aria-label={groupLabel}>
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            className={`dri-chip${isSelected ? " dri-chip--selected" : ""}`}
            aria-pressed={isSelected}
            onClick={() => onToggle(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type ChipSingleProps<T extends string> = {
  options: readonly { id: T; label: string }[];
  selected: T | "";
  onSelect: (id: T) => void;
  groupLabel: string;
};

function ChipSingle<T extends string>({ options, selected, onSelect, groupLabel }: ChipSingleProps<T>) {
  return (
    <div className="dri-chips" role="radiogroup" aria-label={groupLabel}>
      {options.map((option) => {
        const isSelected = selected === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`dri-chip${isSelected ? " dri-chip--selected" : ""}`}
            onClick={() => onSelect(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type QuestionStepProps = {
  eyebrow: string;
  stepNum: number;
  totalSteps: number;
  prompt?: string;
  fieldPrompt?: string;
  support?: string;
  optional?: boolean;
  eyebrowOptional?: boolean;
  packageBadge?: string;
  children: React.ReactNode;
};

function QuestionStep({
  eyebrow,
  prompt,
  fieldPrompt,
  support,
  optional = false,
  eyebrowOptional = false,
  packageBadge,
  children,
}: Omit<QuestionStepProps, "stepNum" | "totalSteps">) {
  return (
    <div className="dri-step-content">
      {packageBadge ? <span className="dri-badge">{packageBadge}</span> : null}
      <p className="dri-eyebrow">
        {eyebrow}
        {eyebrowOptional ? <OptionalLabel /> : null}
      </p>
      {prompt ? (
        <h3 className="dri-prompt">
          {prompt}
          {optional ? <OptionalLabel /> : null}
        </h3>
      ) : null}
      {fieldPrompt ? <OptionalFollowUpLabel label={fieldPrompt} /> : null}
      {support ? <p className="dri-support">{support}</p> : null}
      <div className="dri-step-input">{children}</div>
    </div>
  );
}

type IntakeProgressProps = {
  step: number;
  totalSteps: number;
};

function IntakeProgress({ step, totalSteps }: IntakeProgressProps) {
  const { introduction } = draftRoom.intakeForm;
  const isIntro = step === 0;
  const isReview = step === DRAFT_INTAKE_REVIEW_STEP;
  const questionStep = step >= 1 && step <= totalSteps ? step : null;

  const label = isIntro
    ? introduction.progressLabel ?? "Getting started"
    : isReview
      ? "Review your answers"
      : `Step ${questionStep} of ${totalSteps}`;

  return (
    <div className="dri-intake-progress" aria-live="polite">
      <p className="dri-intake-progress__label">{label}</p>
      <div
        className="dri-intake-progress__dots"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-valuenow={questionStep ?? totalSteps}
        aria-label={label}
      >
        {Array.from({ length: totalSteps }, (_, index) => {
          const dotStep = index + 1;
          let state = "remaining";
          if (isReview || (questionStep !== null && dotStep < questionStep)) {
            state = "complete";
          } else if (questionStep !== null && dotStep === questionStep) {
            state = "current";
          }
          return (
            <span
              key={dotStep}
              className={`dri-intake-progress__dot dri-intake-progress__dot--${state}`}
              aria-hidden="true"
            />
          );
        })}
      </div>
    </div>
  );
}

function OptionalFollowUpLabel({ label }: { label: string }) {
  return (
    <p className="dri-followup dri-followup--field">
      {label}
      <OptionalLabel />
    </p>
  );
}

type HybridBlockProps = {
  chipHint: string;
  chips: React.ReactNode;
  followUp?: string;
  followUpOptional?: boolean;
  field?: React.ReactNode;
};

function HybridBlock({ chipHint, chips, followUp, followUpOptional = false, field }: HybridBlockProps) {
  return (
    <div className="dri-hybrid">
      <p className="dri-chip-hint">{chipHint}</p>
      {chips}
      {followUp ? (
        <p className="dri-followup">
          {followUp}
          {followUpOptional ? <OptionalLabel /> : null}
        </p>
      ) : null}
      {field}
    </div>
  );
}

export default function DraftIntakeForm({
  values,
  onChange,
  onSubmit,
  submitting,
  valid,
  packageBadge,
  step: controlledStep,
  onStepChange,
  submitError,
  reviewingAfterSubmit = false,
}: Props) {
  const { intakeForm, confirmation } = draftRoom;
  const { introduction, sections, totalSteps, review } = intakeForm;
  const [internalStep, setInternalStep] = useState(0);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [submitArmDelay, setSubmitArmDelay] = useState(false);
  const formBodyRef = useRef<HTMLDivElement>(null);
  const step = controlledStep ?? internalStep;

  const setStep = useCallback(
    (next: number | ((current: number) => number)) => {
      const resolved = typeof next === "function" ? next(step) : next;
      if (onStepChange) {
        onStepChange(resolved);
      } else {
        setInternalStep(resolved);
      }
    },
    [onStepChange, step],
  );

  const patch = useCallback(
    (partial: Partial<DraftIntakeFormValues>) => {
      onChange({ ...values, ...partial });
    },
    [onChange, values],
  );

  const stepValid = isDraftIntakeStepValid(step, values);
  const isReviewStep = step === DRAFT_INTAKE_REVIEW_STEP;
  const isVisionStep = step === sections.vision.number;
  const scrollFormBody = isVisionStep || isReviewStep;
  const isLastQuestionStep = step === totalSteps;
  const isLastStep = isReviewStep;

  const handleContinue = () => {
    if (!stepValid) return;
    if (isLastQuestionStep) {
      setEditingFromReview(false);
      setSubmitArmDelay(true);
      setStep(DRAFT_INTAKE_REVIEW_STEP);
      window.setTimeout(() => setSubmitArmDelay(false), 400);
      return;
    }
    setStep((current) => Math.min(current + 1, totalSteps));
  };

  const handleBack = () => {
    if (editingFromReview) {
      setEditingFromReview(false);
      setStep(DRAFT_INTAKE_REVIEW_STEP);
      return;
    }
    if (step === DRAFT_INTAKE_REVIEW_STEP) {
      setStep(totalSteps);
      return;
    }
    setStep((current) => Math.max(current - 1, 0));
  };

  const handleEditFromSummary = useCallback(
    (target: number) => {
      setEditingFromReview(true);
      setStep(target);
    },
    [setStep],
  );

  const submitLabel = reviewingAfterSubmit
    ? confirmation.resubmitLabel
    : intakeForm.submitLabel;

  const studioNote =
    step >= 1 && step <= totalSteps
      ? intakeDesignSystem.studioNotes[step as keyof typeof intakeDesignSystem.studioNotes]
      : null;
  const studioNoteHasSpark = intakeDesignSystem.studioNoteSparkSteps.includes(
    step as (typeof intakeDesignSystem.studioNoteSparkSteps)[number],
  );

  const handleSubmitClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onSubmit(event as unknown as React.FormEvent);
  };

  useLayoutEffect(() => {
    if (!scrollFormBody) return;
    formBodyRef.current?.scrollTo({ top: 0 });
  }, [step, scrollFormBody]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="dri-step-content dri-step-content--intro">
            <p className="dri-eyebrow">{introduction.eyebrow}</p>
            <h2 className="dri-title">{introduction.title}</h2>
            <div className="dri-intro-leads" aria-hidden>
              {introduction.leads.map((line) => (
                <p key={line} className="dri-intro-lead">
                  {line}
                </p>
              ))}
            </div>
            {introduction.paragraphs.map((paragraph) => (
              <p key={paragraph} className="dri-body">
                {paragraph}
              </p>
            ))}
            <div className="dri-intro-starters" aria-hidden>
              <p className="dri-intro-starters-label">
                <svg className="dri-intro-spark" viewBox="0 0 16 16" aria-hidden>
                  <path
                    d="M8 2.5v11M4.5 8h7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                {introduction.ideaStartersLabel}
              </p>
              <div className="dri-intro-starter-cards">
                {introduction.ideaStarters.map((idea) => (
                  <span key={idea} className="dri-intro-starter">
                    {idea}
                  </span>
                ))}
              </div>
            </div>
            <p className="dri-intro-closing">{introduction.closingNote}</p>
          </div>
        );

      case 1:
        return (
          <QuestionStep
            eyebrow={sections.project.eyebrow}
            prompt={sections.project.prompt}
            support={sections.project.support}
            packageBadge={packageBadge}
          >
            <ProjectPicker
              starter={values.projectStarter}
              detail={values.projectDetail}
              chips={sections.project.starterChips}
              chipHint={sections.project.chipHint}
              detailPlaceholder={sections.project.detailPlaceholder}
              otherPlaceholder={sections.project.otherPlaceholder}
              onChange={(projectPatch) => patch(projectPatch)}
            />
          </QuestionStep>
        );

      case 2:
        return (
          <QuestionStep
            eyebrow={sections.business.eyebrow}
            prompt={sections.business.prompt}
            support={sections.business.support}
          >
            <TextField
              label={sections.business.prompt}
              value={values.business}
              placeholder={sections.business.placeholder}
              fieldSize="business"
              onChange={(business) => patch({ business })}
            />
          </QuestionStep>
        );

      case 3:
        return (
          <QuestionStep
            eyebrow={sections.audience.eyebrow}
            prompt={sections.audience.prompt}
            support={sections.audience.support}
          >
            <HybridBlock
              chipHint={sections.audience.chipHint}
              chips={
                <ChipSingle
                  options={sections.audience.options}
                  selected={values.audienceFit}
                  onSelect={(audienceFit) =>
                    patch({
                      audienceFit: values.audienceFit === audienceFit ? "" : audienceFit,
                      audienceNotes: values.audienceFit === audienceFit ? "" : values.audienceNotes,
                    })
                  }
                  groupLabel={sections.audience.chipHint}
                />
              }
              followUp={values.audienceFit ? sections.audience.followUp : undefined}
              followUpOptional={Boolean(values.audienceFit)}
              field={
                values.audienceFit ? (
                  <TextField
                    label={sections.audience.followUp}
                    value={values.audienceNotes}
                    placeholder={sections.audience.placeholder}
                    fieldSize="compact"
                    onChange={(audienceNotes) => patch({ audienceNotes })}
                  />
                ) : null
              }
            />
          </QuestionStep>
        );

      case 4:
        return (
          <QuestionStep
            eyebrow={sections.goal.eyebrow}
            prompt={sections.goal.prompt}
            support={sections.goal.support}
          >
            <HybridBlock
              chipHint={sections.goal.chipHint}
              chips={
                <ChipMulti
                  options={sections.goal.options}
                  selected={values.goalSelections}
                  onToggle={(id) => {
                    const next = toggleChip(values.goalSelections, id);
                    patch({
                      goalSelections: next,
                      goalNotes: next.includes("other") ? values.goalNotes : "",
                    });
                  }}
                  groupLabel={sections.goal.chipHint}
                />
              }
              followUp={values.goalSelections.includes("other") ? sections.goal.otherFollowUp : undefined}
              followUpOptional={values.goalSelections.includes("other")}
              field={
                values.goalSelections.includes("other") ? (
                  <TextField
                    label={sections.goal.otherFollowUp}
                    value={values.goalNotes}
                    placeholder={sections.goal.otherPlaceholder}
                    fieldSize="compact"
                    onChange={(goalNotes) => patch({ goalNotes })}
                  />
                ) : null
              }
            />
          </QuestionStep>
        );

      case 5:
        return (
          <QuestionStep
            eyebrow={sections.brandPersonality.eyebrow}
            prompt={sections.brandPersonality.prompt}
            support={sections.brandPersonality.support}
          >
            <HybridBlock
              chipHint={sections.brandPersonality.chipHint}
              chips={
                <ChipMulti
                  options={sections.brandPersonality.options}
                  selected={values.brandPersonalitySelections}
                  onToggle={(id) =>
                    patch({
                      brandPersonalitySelections: toggleChip(values.brandPersonalitySelections, id),
                    })
                  }
                  groupLabel={sections.brandPersonality.chipHint}
                />
              }
              followUp={sections.brandPersonality.followUp}
              followUpOptional
              field={
                <TextField
                  label={sections.brandPersonality.followUp}
                  value={values.brandPersonalityNotes}
                  placeholder={sections.brandPersonality.placeholder}
                  fieldSize="compact"
                  onChange={(brandPersonalityNotes) => patch({ brandPersonalityNotes })}
                />
              }
            />
          </QuestionStep>
        );

      case 6:
        return (
          <QuestionStep
            eyebrow={sections.brandColors.eyebrow}
            prompt={sections.brandColors.prompt}
            support={sections.brandColors.support}
          >
            <p className="dri-chip-hint">{sections.brandColors.hasColorsPrompt}</p>
            <ChipSingle
              options={sections.brandColors.hasColorsOptions}
              selected={values.brandHasColors}
              onSelect={(brandHasColors) => {
                const togglingOff = values.brandHasColors === brandHasColors;
                if (togglingOff) {
                  patch({
                    brandHasColors: "",
                    brandColorList: "",
                    brandColorSelections: [],
                    brandColorNotes: "",
                  });
                } else if (brandHasColors === "yes") {
                  patch({
                    brandHasColors: "yes",
                    brandColorSelections: [],
                    brandColorNotes: "",
                  });
                } else {
                  patch({
                    brandHasColors: "no",
                    brandColorList: "",
                    brandColorNotes: "",
                  });
                }
              }}
              groupLabel={sections.brandColors.hasColorsPrompt}
            />
            {values.brandHasColors === "yes" ? (
              <div className="dri-color-list">
                <TextField
                  label={sections.brandColors.colorListLabel}
                  value={values.brandColorList}
                  placeholder={sections.brandColors.colorListPlaceholder}
                  fieldSize="color-list"
                  showLabel
                  onChange={(brandColorList) => patch({ brandColorList })}
                />
                <p className="dri-field-examples">{sections.brandColors.colorListExamples}</p>
              </div>
            ) : values.brandHasColors === "no" ? (
              <div className="dri-color-direction">
                <p className="dri-chip-hint">{sections.brandColors.directionChipHint}</p>
                <ChipMulti
                  options={sections.brandColors.directionOptions}
                  selected={values.brandColorSelections}
                  onToggle={(id) =>
                    patch({ brandColorSelections: toggleChip(values.brandColorSelections, id) })
                  }
                  groupLabel={sections.brandColors.directionChipHint}
                />
              </div>
            ) : null}
          </QuestionStep>
        );

      case 7:
        return (
          <QuestionStep
            eyebrow={sections.vision.eyebrow}
            fieldPrompt={sections.vision.prompt}
            support={sections.vision.support}
          >
            <TextField
              label={sections.vision.prompt}
              value={values.anythingElse}
              placeholder={sections.vision.placeholder}
              fieldSize="notes"
              onChange={(anythingElse) => patch({ anythingElse })}
            />
          </QuestionStep>
        );

      case 8:
        return (
          <QuestionStep
            eyebrow={sections.inspiration.eyebrow}
            fieldPrompt={sections.inspiration.prompt}
            support={sections.inspiration.support}
          >
            <TextField
              label={sections.inspiration.prompt}
              value={values.inspirationLike}
              placeholder={sections.inspiration.placeholder}
              fieldSize="references"
              onChange={(inspirationLike) => patch({ inspirationLike })}
            />
          </QuestionStep>
        );

      case DRAFT_INTAKE_REVIEW_STEP:
        return (
          <DraftIntakeAnswerSummary values={values} onEditStep={handleEditFromSummary} />
        );

      default:
        return null;
    }
  };

  return (
    <form
      className={`dri-form dri-form--wizard-shell${submitting ? " dri-form--submitting" : ""}${isVisionStep ? " dri-form--step-vision" : ""}`}
      onSubmit={onSubmit}
      noValidate
    >
      <IntakeProgress step={step} totalSteps={totalSteps} />

      {reviewingAfterSubmit && isReviewStep ? (
        <p className="dri-review-banner">{confirmation.reviewBanner}</p>
      ) : null}
      {editingFromReview ? (
        <p className="dri-review-banner dri-review-banner--editing">{review.editingBanner}</p>
      ) : null}

      <div
        ref={formBodyRef}
        className={`dri-form-body${scrollFormBody ? " dri-form-body--scroll" : ""}`}
      >
        {isVisionStep ? <IntakeVisionAccents /> : null}
        {renderStep()}
      </div>

      <div className="dri-form-footer">
        {submitError ? <p className="dri-error">{submitError}</p> : null}
        {isLastQuestionStep && !submitError ? (
          <p className="dri-submit-hint">Next you&apos;ll see everything you shared in one place.</p>
        ) : null}
        {studioNote ? (
          <p className="dri-studio-note" aria-hidden>
            {studioNoteHasSpark ? <StudioNoteSpark /> : null}
            {studioNote}
          </p>
        ) : null}

        <div className="dri-intake-nav">
          <div className="dri-intake-nav__back">
            {step > 0 ? (
              <button type="button" className="utility-btn utility-btn--secondary" onClick={handleBack}>
                {editingFromReview ? review.backToReviewLabel : "Back"}
              </button>
            ) : (
              <span className="dri-intake-nav__spacer" aria-hidden="true" />
            )}
          </div>

          <div className="dri-intake-nav__continue">
            {!isLastStep ? (
              <button
                type="button"
                className="utility-btn utility-btn--primary"
                disabled={!stepValid}
                onClick={handleContinue}
              >
                {step === 0
                  ? introduction.continueLabel
                  : isLastQuestionStep
                    ? "Review answers"
                    : "Continue"}
              </button>
            ) : (
              <button
                type="button"
                className="utility-btn utility-btn--primary"
                disabled={!valid || submitting || submitArmDelay}
                onClick={handleSubmitClick}
              >
                {submitting ? "Saving your direction…" : submitLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
