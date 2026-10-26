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
  condensedIntakeWelcomeFor,
  isCondensedHeadlineId,
} from "@/config/studio-customer-journey-condense-v1";
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
  flyerMustIncludeHasProductionFacts,
  flyerIntakeAnswerKey,
  FLYER_MUST_INCLUDE_PRODUCTION_HINT,
  visibleKeysUseFlyerCorrection,
} from "@/lib/project-intake-flyer-production";
import {
  buildProjectIntakePlan,
  projectIntakeServiceFieldKey,
  type ProjectIntakePlan,
} from "@/lib/project-intake-plan";
import { PROJECT_INTAKE_AUTOSAVE_DEBOUNCE_MS } from "@/lib/project-intake-tablet-status";
import type { ServiceId } from "@/catalog/types";

import "@/app/route-map/route-map.css";
import "@/app/studio-visual-system-v2.css";
import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";

const INTAKE_LIVE_STATUS_DEBOUNCE_MS = 280;

export type ProjectIntakeMultiServiceFormProps = {
  selectedServiceIds: readonly ServiceId[];
  initialDraftAnswers?: RouteMapIntakeAnswers | null;
  prefillBusinessName?: string | null;
  onSaveDraft?: (answers: RouteMapIntakeAnswers) => boolean;
  onSubmit: (answers: RouteMapIntakeAnswers) => boolean | Promise<boolean>;
  onDraftStatusChange?: (status: "unsaved" | "saved" | "error") => void;
  /** Live answer stream for tablet status (every change, including mount). */
  onAnswersChange?: (answers: RouteMapIntakeAnswers) => void;
  /** Phone Conversation Room: stack questions, lighter glass. Desktop overlay unchanged. */
  phoneLayout?: boolean;
  /** Show only these answer keys — used for flyer production correction. */
  visibleAnswerKeys?: readonly string[] | null;
  /** Shown with the required keys. Empty answers do not block continue. */
  optionalAnswerKeys?: readonly string[] | null;
  submitError?: string | null;
  /** Shown after the unpaid preview saves. Not a failure. */
  statusNote?: string | null;
  /** Truthful handoff — must match real next destination. */
  submitCtaLabel: string;
  /** When set, skip catalog schema lookup and render this plan. */
  intakePlan?: ProjectIntakePlan | null;
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
  paintKey,
}: {
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  required?: boolean;
  rows?: number;
  placeholder?: string;
  autoFocus?: boolean;
  paintKey: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const focusedRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const [browserPaintLocked, setBrowserPaintLocked] = useState(true);

  function unlockBrowserPaint(
    node: HTMLInputElement | HTMLTextAreaElement | null,
  ) {
    if (node) node.readOnly = false;
    setBrowserPaintLocked(false);
  }

  useEffect(() => {
    if (focusedRef.current) return;
    const node = multiline ? areaRef.current : inputRef.current;
    if (node && node.value !== value) node.value = value;
  }, [value, multiline]);

  useEffect(() => {
    if (!autoFocus) return;
    const node = multiline ? areaRef.current : inputRef.current;
    unlockBrowserPaint(node);
    node?.focus();
  }, [autoFocus, multiline]);

  function handleChange(next: string) {
    onChange(next);
  }

  const fieldName = `siw-${paintKey}`;
  const shared = {
    name: fieldName,
    className: styles.intakeTypeLine,
    "data-intake-type-line": "true",
    autoComplete: "off" as const,
    autoCorrect: "off",
    autoCapitalize: "none" as const,
    spellCheck: false,
    "data-lpignore": "true",
    "data-1p-ignore": "true",
    "data-form-type": "other",
    readOnly: browserPaintLocked,
    onPointerDown: () =>
      unlockBrowserPaint(multiline ? areaRef.current : inputRef.current),
  };

  if (multiline) {
    return (
      <textarea
        ref={areaRef}
        required={required}
        rows={rows}
        placeholder={placeholder}
        defaultValue={value}
        {...shared}
        onFocus={() => {
          unlockBrowserPaint(areaRef.current);
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
      inputMode="text"
      {...shared}
      onFocus={() => {
        unlockBrowserPaint(inputRef.current);
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
            data-selected={selected ? "true" : "false"}
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
  compactCopy = false,
}: {
  step: number;
  field: RouteMapIntakeField;
  value: string;
  onChange: (next: string) => void;
  onMaterialsAvailability?: (availability: string) => void;
  onMaterialsDetail?: (detail: string) => void;
  compactCopy?: boolean;
}) {
  const requiredMark = field.required ? (
    <span className="route-map-intake__req">Required</span>
  ) : (
    <span className="route-map-intake__opt">Optional</span>
  );
  const hint = field.hint;

  if (field.role === "materials" && onMaterialsAvailability && onMaterialsDetail) {
    const parsed = parseMaterialsPathAnswer(value);
    const describeOpen = parsed.availability === INTAKE_MATERIALS_HAVE_NOW;
    return (
      <article className="route-map-social-intake__card route-map-social-intake__card--materials">
        <div className="route-map-social-intake__card-head">
          <p className="route-map-social-intake__step">{step}</p>
          <div className="route-map-social-intake__card-copy">
            <h3>
              {field.label} {requiredMark}
            </h3>
            {hint ? <p>{hint}</p> : null}
          </div>
        </div>
        <ChoiceChips
          options={[...INTAKE_MATERIALS_AVAILABILITY_OPTIONS]}
          value={parsed.availability}
          onSelect={onMaterialsAvailability}
        />
        {describeOpen ? (
          <label className={styles.intakeTypeWell} data-intake-type-well="true">
            <span>
              {field.placeholder ?? "Describe filenames, links, colors, or references"}
            </span>
            <IntakePlainTextField
              key={`${field.id}-describe`}
              paintKey={`${step}d`}
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

  if (field.type === "checkbox") {
    const checked = value.trim() === field.label;
    return (
      <article className="route-map-social-intake__card">
        <label className={styles.intakeCheck}>
          <input
            type="checkbox"
            checked={checked}
            required={field.required}
            onChange={(event) => onChange(event.target.checked ? field.label : "")}
          />
          <span>
            {field.label} {requiredMark}
          </span>
        </label>
      </article>
    );
  }

  if (field.type === "select") {
    return (
      <article className="route-map-social-intake__card">
        <div className="route-map-social-intake__card-head">
          <p className="route-map-social-intake__step">{step}</p>
          <div className="route-map-social-intake__card-copy">
            <h3>
              {field.label} {requiredMark}
            </h3>
            {hint ? <p>{hint}</p> : null}
          </div>
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
      <div className="route-map-social-intake__card-head">
        <p className="route-map-social-intake__step">{step}</p>
        <div className="route-map-social-intake__card-copy">
          <h3>
            {field.label} {requiredMark}
          </h3>
          {hint ? <p>{hint}</p> : null}
        </div>
      </div>
      <label className={styles.intakeTypeWell} data-intake-type-well="true">
        <span className="sr-only">{field.label}</span>
        <IntakePlainTextField
          paintKey={`${step}`}
          multiline={field.type === "textarea"}
          required={field.required}
          rows={compactCopy ? 3 : 4}
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
  statusNote = null,
  submitCtaLabel,
  nextStepBlurb,
  intakePlan = null,
  phoneLayout = false,
  visibleAnswerKeys = null,
  optionalAnswerKeys = null,
}: ProjectIntakeMultiServiceFormProps) {
  const plan: ProjectIntakePlan = useMemo(
    () => intakePlan ?? buildProjectIntakePlan(selectedServiceIds),
    [intakePlan, selectedServiceIds],
  );
  const condensedPackageName =
    plan.services.length === 1 && isCondensedHeadlineId(plan.services[0]?.serviceId)
      ? plan.services[0]?.title
      : null;
  const intakeWelcome = condensedIntakeWelcomeFor(
    plan.services.length === 1 ? plan.services[0]?.serviceId : null,
  );
  const guidedIntake = Boolean(phoneLayout && intakeWelcome);
  const guidedPackageName = guidedIntake
    ? plan.services[0]?.title ?? null
    : condensedPackageName;

  const [answers, setAnswers] = useState<RouteMapIntakeAnswers>(() =>
    prefillProjectIntakeAnswers(plan, initialDraftAnswers, {
      businessName: prefillBusinessName,
    }),
  );
  const [submitting, setSubmitting] = useState(false);

  const touchedAnswerKeys = useRef(new Set<string>());

  useEffect(() => {
    const seeded = prefillProjectIntakeAnswers(plan, initialDraftAnswers, {
      businessName: prefillBusinessName,
    });
    setAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [key, value] of Object.entries(seeded)) {
        if (touchedAnswerKeys.current.has(key)) continue;
        if (String(next[key] ?? "").trim()) continue;
        if (!String(value ?? "").trim()) continue;
        next[key] = value;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [initialDraftAnswers, plan, prefillBusinessName]);

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

  const correctionKeys = visibleAnswerKeys;
  const isCorrection = visibleKeysUseFlyerCorrection(correctionKeys);
  const optionalKeys = optionalAnswerKeys ?? [];
  const isVisibleKey = (key: string) =>
    !correctionKeys || correctionKeys.includes(key) || optionalKeys.includes(key);

  const progress = isCorrection
    ? {
        completed: (correctionKeys ?? []).filter((key) =>
          String(answers[key] ?? "").trim(),
        ).length,
        total: correctionKeys?.length ?? 0,
      }
    : projectIntakeProgressLabel(plan, answers);
  const mustIncludeValue = answers[flyerIntakeAnswerKey("mustInclude")] ?? "";
  const mustIncludeFactsOk = flyerMustIncludeHasProductionFacts(mustIncludeValue);
  const ready = isCorrection
    ? (correctionKeys ?? []).every((key) => String(answers[key] ?? "").trim()) &&
      mustIncludeFactsOk
    : isProjectIntakePlanReady(plan, answers);
  const nextStepCopy = phoneLayout
    ? nextStepBlurb.replaceAll("section", "question")
    : nextStepBlurb;

  function setAnswer(key: string, value: string) {
    touchedAnswerKeys.current.add(key);
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
    void Promise.resolve(onSubmit(answers)).then((ok) => {
      if (!ok) setSubmitting(false);
    });
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
    <section
      className="route-map-social-intake"
      aria-labelledby="project-intake-title"
      data-intake-layout={phoneLayout ? "phone" : "desktop"}
    >
      <div className="route-map-social-intake__header">
        {guidedPackageName ? (
          <div>
            {guidedIntake ? null : (
              <p className="route-map-social-intake__eyebrow">Project Intake</p>
            )}
            <h2
              id="project-intake-title"
              className={
                guidedIntake
                  ? "studio-journey__intake-name"
                  : "route-map-social-intake__title"
              }
            >
              {guidedPackageName}
            </h2>
            {guidedIntake && intakeWelcome ? (
              <>
                <p className="studio-homepage__card-detail">{intakeWelcome.detailsLabel}</p>
                <p className="studio-homepage__card-detail">{intakeWelcome.filesNote}</p>
                <p className="studio-homepage__card-detail">{intakeWelcome.savedNote}</p>
              </>
            ) : null}
          </div>
        ) : phoneLayout ? (
            <h2 id="project-intake-title" className={styles.intakeVisuallyHidden}>
              Project materials
            </h2>
        ) : (
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
        )}
        {guidedIntake ? null : (
          <div className="route-map-social-intake__progress" aria-live="polite">
            <strong>
              {progress.completed} of {progress.total}
            </strong>
            <span>sections ready to submit</span>
          </div>
        )}
      </div>

      {phoneLayout ? null : (
        <p className={styles.intakeMaterialsNote} role="note">
          {conversationRoomGuideV1.intakeMaterialsDeadlineNote}
        </p>
      )}

      <form
        className="route-map-social-intake__form"
        autoComplete="off"
        onSubmit={handleSubmit}
      >
            {plan.sharedFields.some((shared) => isVisibleKey(shared.answerKey)) ? (
          <div className={styles.intakeSectionBlock}>
            {isCorrection || guidedIntake ? null : (
              <h3 className={styles.intakeSectionHeading}>Shared for this project</h3>
            )}
            {plan.sharedFields.map((shared) => {
              if (!isVisibleKey(shared.answerKey)) return null;
              step += 1;
              const currentStep = step;
              return (
                <FieldCard
                  key={shared.answerKey}
                  step={currentStep}
                  field={shared.field}
                  compactCopy={phoneLayout}
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

        {plan.services.map((section) => {
          const visibleFields = section.fields.filter((field) =>
            isVisibleKey(projectIntakeServiceFieldKey(section.serviceId, field.id)),
          );
          if (visibleFields.length === 0) return null;
          return (
          <div key={section.serviceId} className={styles.intakeSectionBlock}>
            {guidedIntake && section.title === guidedPackageName ? null : (
              <h3 className={styles.intakeSectionHeading}>{section.title}</h3>
            )}
            {phoneLayout || isCorrection || condensedPackageName ? null : (
              <p className={styles.intakeSectionLead}>{section.jobName}</p>
            )}
            {visibleFields.map((field) => {
              step += 1;
              const key = projectIntakeServiceFieldKey(section.serviceId, field.id);
              const currentStep = step;
              const correctionField =
                isCorrection && field.id === "mustInclude"
                  ? {
                      ...field,
                      hint: FLYER_MUST_INCLUDE_PRODUCTION_HINT,
                    }
                  : field;
              return (
                <FieldCard
                  key={key}
                  step={currentStep}
                  field={correctionField}
                  compactCopy={phoneLayout}
                  value={answers[key] ?? ""}
                  onChange={(next) => setAnswer(key, next)}
                />
              );
            })}
            {isCorrection && !mustIncludeFactsOk && mustIncludeValue.trim() ? (
              <p className={styles.intakeContinueHint} role="status">
                {FLYER_MUST_INCLUDE_PRODUCTION_HINT}
              </p>
            ) : null}
          </div>
          );
        })}

        <div className="route-map-social-intake__actions">
          <div
            id="intake-continue-hint"
            className="route-map-social-intake__next-step"
          >
            <strong>Next Step</strong>
            <span>{nextStepCopy}</span>
          </div>
          <button
            type="button"
            className="route-map-secondary-btn"
            data-intake-action="draft"
            onClick={handleSaveDraft}
            disabled={submitting}
          >
            Save draft
          </button>
          <button
            type="submit"
            className="route-map-primary-btn"
            data-intake-action="continue"
            disabled={submitting || !ready}
            aria-describedby={!ready ? "intake-continue-hint" : undefined}
          >
            {submitCtaLabel}
          </button>
        </div>
        {statusNote ? (
          <p data-intake-preview-status="saved" role="status">
            {statusNote}
          </p>
        ) : null}
        {submitError ? (
          <p className="route-map-social-intake__submit-error" role="alert">
            {submitError}
          </p>
        ) : null}
      </form>
    </section>
  );
}
