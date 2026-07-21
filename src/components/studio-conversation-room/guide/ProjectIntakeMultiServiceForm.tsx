"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type { RouteMapIntakeAnswers, RouteMapIntakeField } from "@/catalog/intake";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import {
  INTAKE_MATERIALS_AVAILABILITY_OPTIONS,
  INTAKE_MATERIALS_HAVE_NOW,
  parseMaterialsPathAnswer,
} from "@/lib/route-map-intake-materials";
import {
  isProjectIntakePlanReady,
  prefillProjectIntakeAnswers,
  projectIntakeProgressLabel,
  setSharedMaterialsAnswer,
} from "@/lib/project-intake-completeness";
import {
  buildProjectIntakePlan,
  projectIntakeServiceFieldKey,
  type ProjectIntakePlan,
} from "@/lib/project-intake-plan";
import { PROJECT_INTAKE_AUTOSAVE_DEBOUNCE_MS } from "@/lib/project-intake-tablet-status";
import type { ServiceId } from "@/catalog/types";

import "@/app/route-map/route-map.css";
import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";

/** Tablet status updates — delayed so typing does not re-render the whole room each key. */
const INTAKE_LIVE_STATUS_DEBOUNCE_MS = 280;

export type ProjectIntakeMultiServiceFormProps = {
  selectedServiceIds: readonly ServiceId[];
  initialDraftAnswers?: RouteMapIntakeAnswers | null;
  prefillBusinessName?: string | null;
  onSaveDraft?: (answers: RouteMapIntakeAnswers) => boolean;
  onSubmit: (answers: RouteMapIntakeAnswers) => boolean;
  onDraftStatusChange?: (status: "unsaved" | "saved" | "error") => void;
  /** Live answer stream for tablet status (every change, including mount). */
  onAnswersChange?: (answers: RouteMapIntakeAnswers) => void;
  submitError?: string | null;
  /** Truthful handoff — must match real next destination. */
  submitCtaLabel: string;
  nextStepBlurb: string;
};

/**
 * Uncontrolled while focused — parent re-renders (tablet status / autosave)
 * must not rewrite the DOM value mid-keystroke.
 */
function IntakePlainTextField({
  value,
  onChange,
  multiline = false,
  required = false,
  rows = 3,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  required?: boolean;
  rows?: number;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const focusedRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (focusedRef.current) return;
    const node = multiline ? areaRef.current : inputRef.current;
    if (node && node.value !== value) node.value = value;
  }, [value, multiline]);

  useEffect(() => {
    if (!autoFocus) return;
    const node = multiline ? areaRef.current : inputRef.current;
    node?.focus();
  }, [autoFocus, multiline]);

  function handleChange(next: string) {
    onChange(next);
  }

  if (multiline) {
    return (
      <textarea
        ref={areaRef}
        required={required}
        rows={rows}
        placeholder={placeholder}
        defaultValue={value}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          const next = areaRef.current?.value ?? "";
          if (next !== valueRef.current) onChange(next);
        }}
        onChange={(event) => handleChange(event.target.value)}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      required={required}
      placeholder={placeholder}
      defaultValue={value}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        const next = inputRef.current?.value ?? "";
        if (next !== valueRef.current) onChange(next);
      }}
      onChange={(event) => handleChange(event.target.value)}
    />
  );
}

function ChoiceChips({
  options,
  value,
  onSelect,
}: {
  options: readonly string[];
  value: string;
  onSelect: (label: string) => void;
}) {
  return (
    <div className="route-map-social-intake__chips" role="group">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            className={`route-map-social-intake__chip${
              selected ? " route-map-social-intake__chip--selected" : ""
            }`}
            aria-pressed={selected}
            onClick={() => onSelect(option)}
          >
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
}

function FieldCard({
  step,
  field,
  value,
  onChange,
  onMaterialsAvailability,
  onMaterialsDetail,
}: {
  step: number;
  field: RouteMapIntakeField;
  value: string;
  onChange: (next: string) => void;
  onMaterialsAvailability?: (availability: string) => void;
  onMaterialsDetail?: (detail: string) => void;
}) {
  const requiredMark = field.required ? (
    <span className="route-map-intake__req">Required</span>
  ) : (
    <span className="route-map-intake__opt">Optional</span>
  );

  if (field.role === "materials" && onMaterialsAvailability && onMaterialsDetail) {
    const parsed = parseMaterialsPathAnswer(value);
    const describeOpen = parsed.availability === INTAKE_MATERIALS_HAVE_NOW;
    return (
      <article className="route-map-social-intake__card route-map-social-intake__card--materials">
        <p className="route-map-social-intake__step">{step}</p>
        <div className="route-map-social-intake__card-copy">
          <h3>
            {field.label} {requiredMark}
          </h3>
          {field.hint ? <p>{field.hint}</p> : null}
        </div>
        <ChoiceChips
          options={[...INTAKE_MATERIALS_AVAILABILITY_OPTIONS]}
          value={parsed.availability}
          onSelect={onMaterialsAvailability}
        />
        {describeOpen ? (
          <label className="route-map-social-intake__compact-field">
            <span>Describe filenames, links, colors, or references</span>
            <IntakePlainTextField
              key={`${field.id}-describe`}
              multiline
              required={Boolean(field.required)}
              rows={3}
              placeholder={field.placeholder}
              value={parsed.detail}
              onChange={onMaterialsDetail}
              autoFocus
            />
          </label>
        ) : null}
      </article>
    );
  }

  if (field.type === "select") {
    return (
      <article className="route-map-social-intake__card">
        <p className="route-map-social-intake__step">{step}</p>
        <div className="route-map-social-intake__card-copy">
          <h3>
            {field.label} {requiredMark}
          </h3>
          {field.hint ? <p>{field.hint}</p> : null}
        </div>
        <ChoiceChips
          options={[...(field.options ?? [])]}
          value={value}
          onSelect={onChange}
        />
      </article>
    );
  }

  return (
    <article className="route-map-social-intake__card">
      <p className="route-map-social-intake__step">{step}</p>
      <div className="route-map-social-intake__card-copy">
        <h3>
          {field.label} {requiredMark}
        </h3>
        {field.hint ? <p>{field.hint}</p> : null}
      </div>
      <label className="route-map-social-intake__compact-field">
        <span className="sr-only">{field.label}</span>
        <IntakePlainTextField
          multiline={field.type === "textarea"}
          required={field.required}
          rows={4}
          placeholder={field.placeholder}
          value={value}
          onChange={onChange}
        />
      </label>
    </article>
  );
}

/**
 * Multi-service Project Intake — shared materials/contact + per-service sections.
 */
export default function ProjectIntakeMultiServiceForm({
  selectedServiceIds,
  initialDraftAnswers = null,
  prefillBusinessName = null,
  onSaveDraft,
  onSubmit,
  onDraftStatusChange,
  onAnswersChange,
  submitError = null,
  submitCtaLabel,
  nextStepBlurb,
}: ProjectIntakeMultiServiceFormProps) {
  const plan: ProjectIntakePlan = useMemo(
    () => buildProjectIntakePlan(selectedServiceIds),
    [selectedServiceIds],
  );

  const [answers, setAnswers] = useState<RouteMapIntakeAnswers>(() =>
    prefillProjectIntakeAnswers(plan, initialDraftAnswers, {
      businessName: prefillBusinessName,
    }),
  );
  const [submitting, setSubmitting] = useState(false);

  const onAnswersChangeRef = useRef(onAnswersChange);
  const onSaveDraftRef = useRef(onSaveDraft);
  const onDraftStatusChangeRef = useRef(onDraftStatusChange);
  onAnswersChangeRef.current = onAnswersChange;
  onSaveDraftRef.current = onSaveDraft;
  onDraftStatusChangeRef.current = onDraftStatusChange;

  const skipAutosaveRef = useRef(true);

  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      onAnswersChangeRef.current?.(answers);
      return;
    }
    onDraftStatusChangeRef.current?.("unsaved");
    const statusTimer = window.setTimeout(() => {
      onAnswersChangeRef.current?.(answers);
    }, INTAKE_LIVE_STATUS_DEBOUNCE_MS);
    if (!onSaveDraftRef.current) {
      return () => window.clearTimeout(statusTimer);
    }
    const saveTimer = window.setTimeout(() => {
      const saved = onSaveDraftRef.current?.(answers) ?? false;
      onDraftStatusChangeRef.current?.(saved ? "saved" : "error");
    }, PROJECT_INTAKE_AUTOSAVE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(statusTimer);
      window.clearTimeout(saveTimer);
    };
  }, [answers]);

  const progress = projectIntakeProgressLabel(plan, answers);
  const ready = isProjectIntakePlanReady(plan, answers);

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveDraft() {
    const saved = onSaveDraft?.(answers) ?? false;
    onDraftStatusChange?.(saved ? "saved" : "error");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    const ok = onSubmit(answers);
    if (!ok) setSubmitting(false);
  }

  let step = 0;

  if (plan.services.length === 0) {
    return (
      <p className={styles.intro} role="status">
        No purchasable services were found for Project Intake.
      </p>
    );
  }

  return (
    <section className="route-map-social-intake" aria-labelledby="project-intake-title">
      <div className="route-map-social-intake__header">
        <div>
          <p className="route-map-social-intake__eyebrow">Project Intake</p>
          <h2 id="project-intake-title" className="route-map-social-intake__title">
            Project materials
          </h2>
          <p className="route-map-social-intake__lead">
            Shared brand and contact details are asked once. Each purchased service
            then asks only what is unique to that deliverable. Submitting Project
            Intake does not start production.
          </p>
        </div>
        <div className="route-map-social-intake__progress" aria-live="polite">
          <strong>
            {progress.completed} of {progress.total}
          </strong>
          <span>sections ready to submit</span>
        </div>
      </div>

      <p className={styles.intakeMaterialsNote} role="note">
        {conversationRoomGuideV1.intakeMaterialsDeadlineNote}
      </p>

      <form className="route-map-social-intake__form" onSubmit={handleSubmit}>
        {plan.sharedFields.length > 0 ? (
          <div className={styles.intakeSectionBlock}>
            <h3 className={styles.intakeSectionHeading}>Shared for this project</h3>
            {plan.sharedFields.map((shared) => {
              step += 1;
              const currentStep = step;
              return (
                <FieldCard
                  key={shared.answerKey}
                  step={currentStep}
                  field={shared.field}
                  value={answers[shared.answerKey] ?? ""}
                  onChange={(next) => setAnswer(shared.answerKey, next)}
                  onMaterialsAvailability={
                    shared.field.role === "materials"
                      ? (availability) => {
                          const parsed = parseMaterialsPathAnswer(
                            answers[shared.answerKey],
                          );
                          setAnswer(
                            shared.answerKey,
                            setSharedMaterialsAnswer(
                              shared,
                              availability,
                              availability === INTAKE_MATERIALS_HAVE_NOW
                                ? parsed.detail
                                : "",
                            ),
                          );
                        }
                      : undefined
                  }
                  onMaterialsDetail={
                    shared.field.role === "materials"
                      ? (detail) =>
                          setAnswer(
                            shared.answerKey,
                            setSharedMaterialsAnswer(
                              shared,
                              INTAKE_MATERIALS_HAVE_NOW,
                              detail,
                            ),
                          )
                      : undefined
                  }
                />
              );
            })}
          </div>
        ) : null}

        {plan.services.map((section) => (
          <div key={section.serviceId} className={styles.intakeSectionBlock}>
            <h3 className={styles.intakeSectionHeading}>{section.title}</h3>
            <p className={styles.intakeSectionLead}>{section.jobName}</p>
            {section.fields.map((field) => {
              step += 1;
              const key = projectIntakeServiceFieldKey(section.serviceId, field.id);
              const currentStep = step;
              return (
                <FieldCard
                  key={key}
                  step={currentStep}
                  field={field}
                  value={answers[key] ?? ""}
                  onChange={(next) => setAnswer(key, next)}
                />
              );
            })}
          </div>
        ))}

        <div className="route-map-social-intake__actions">
          <div className="route-map-social-intake__next-step">
            <strong>Next Step</strong>
            <span>{nextStepBlurb}</span>
          </div>
          <button
            type="button"
            className="route-map-secondary-btn"
            onClick={handleSaveDraft}
            disabled={submitting}
          >
            SAVE DRAFT
          </button>
          <button
            type="submit"
            className="route-map-primary-btn"
            disabled={submitting || !ready}
          >
            {submitCtaLabel}
          </button>
        </div>
        {submitError ? (
          <p className="route-map-social-intake__submit-error" role="alert">
            {submitError}
          </p>
        ) : null}
      </form>
    </section>
  );
}
