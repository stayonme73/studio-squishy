"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  getRouteMapIntakeSchema,
  type RouteMapIntakeAnswers,
  type RouteMapIntakeField,
} from "@/config/route-map-intake-v1";
import type { RouteMapJob } from "@/config/route-map-v1";
import {
  schemaAnswersFromDraft,
  socialPostsStateFromAnswers,
} from "@/lib/route-map-intake-continuity";
import {
  buildMaterialsPathAnswer,
  INTAKE_MATERIALS_AVAILABILITY_OPTIONS,
  INTAKE_MATERIALS_HAVE_NOW,
  isMaterialsPathAnswerComplete,
  parseMaterialsPathAnswer,
} from "@/lib/route-map-intake-materials";

type Props = {
  job: RouteMapJob;
  /** Best-effort draft answers to restore on mount (Package 2). */
  initialDraftAnswers?: RouteMapIntakeAnswers | null;
  onSaveDraft?: (answers: RouteMapIntakeAnswers) => boolean;
  /** Return false when submit did not navigate away so the form can recover. */
  onSubmit: (answers: RouteMapIntakeAnswers) => boolean;
  onDraftStatusChange?: (status: "unsaved" | "saved" | "error") => void;
  /** Optional inline submit failure message from the host scene. */
  submitError?: string | null;
  /**
   * `stacked` — Host certified form (default).
   * `cards` — Social Posts–style numbered cards (Conversation Room tablet).
   * Social Posts always uses its custom card UI.
   */
  layout?: "stacked" | "cards";
};

type ChoiceOption = {
  label: string;
  example?: string;
  detail?: string;
};

type SocialPostsIntakeState = {
  purpose: string;
  purposeDetail: string;
  action: string;
  actionDestination: string;
  platform: string;
  materialActions: string[];
  materialNote: string;
  requiredWording: string;
  fileName: string;
  fileMimeType: string;
};

type FileSelectionState = {
  kind: "selected" | "error";
  fileName?: string;
  previewDataUrl?: string;
  message: string;
};

const SOCIAL_POSTS_INTAKE_TYPE = "rtu-social-posts";
const SOCIAL_POSTS_FILE_PREVIEW_MAX_BYTES = 5 * 1024 * 1024;

const SOCIAL_PURPOSE_OPTIONS: readonly ChoiceOption[] = [
  { label: "Promote an offer", example: "Example: 20% off this weekend." },
  { label: "Announce something new", example: "Example: A new service, product, menu item, or location." },
  { label: "Share an event", example: "Example: Open house, pop-up, workshop, or sale day." },
  { label: "Build awareness", example: "Example: Introduce what you do and who you help." },
  {
    label: "Encourage bookings or inquiries",
    example: "Example: Fill appointment openings or invite people to reach out.",
  },
  { label: "Something else", example: "Example: Tell us the situation in one or two sentences." },
];

const SOCIAL_ACTION_OPTIONS: readonly ChoiceOption[] = [
  { label: "Visit website" },
  { label: "Book now" },
  { label: "Call" },
  { label: "Send message" },
  { label: "Visit location" },
  { label: "Learn more" },
  { label: "No action needed" },
];

const SOCIAL_PLATFORM_OPTIONS: readonly ChoiceOption[] = [
  { label: "Instagram Post", detail: "Square or portrait feed graphic" },
  { label: "Facebook Post", detail: "Feed graphic" },
  { label: "LinkedIn Post", detail: "Feed graphic" },
  { label: "I am not sure", detail: "We will choose the safest feed-post format from your goal." },
];

const SOCIAL_MATERIAL_OPTIONS: readonly ChoiceOption[] = [
  { label: "I can provide a logo" },
  { label: "I can provide photos" },
  { label: "Share a past post" },
  { label: "Share a website or social link" },
  { label: "I do not have these yet" },
];

const SOCIAL_MATERIAL_PROVIDE_LOGO = "I can provide a logo";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("File preview failed."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File preview failed."));
    reader.readAsDataURL(file);
  });
}

function selectedPlatformDetail(platform: string): string {
  return SOCIAL_PLATFORM_OPTIONS.find((option) => option.label === platform)?.detail ?? "";
}

function destinationPlaceholder(action: string): string {
  switch (action) {
    case "Call":
      return "Phone number to show, if different from your usual number";
    case "Book now":
      return "Booking link or where people should book";
    case "Visit website":
      return "Website page or link";
    case "Visit location":
      return "Address, hours, or visit note";
    case "Send message":
      return "Where should they message you?";
    case "Learn more":
      return "Link or page for more information";
    default:
      return "Link, phone number, location, or next step";
  }
}

function actionNeedsDestination(action: string): boolean {
  return Boolean(action && action !== "No action needed");
}

function buildSocialPostsAnswers(state: SocialPostsIntakeState): RouteMapIntakeAnswers {
  const platformDetail = selectedPlatformDetail(state.platform);
  const materialLines = [
    `Selected materials path: ${state.materialActions.join(", ")}`,
    state.fileName ? `Selected file: ${state.fileName}` : "",
    state.fileMimeType ? `File type: ${state.fileMimeType}` : "",
    state.materialNote.trim() ? `Notes: ${state.materialNote.trim()}` : "",
  ].filter(Boolean);

  return {
    postsAbout: [state.purpose, state.purposeDetail.trim()].filter(Boolean).join(" — "),
    callToAction: [
      state.action,
      state.actionDestination.trim() ? `Destination: ${state.actionDestination.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" — "),
    platform: [state.platform, platformDetail].filter(Boolean).join(" — "),
    materials: materialLines.join("\n"),
    wordingHashtags:
      state.requiredWording.trim() || "No required wording, disclosures, or hashtags provided yet.",
    mustNotSay: "",
    socialPostsPurposeChoice: state.purpose,
    socialPostsActionChoice: state.action,
    socialPostsPlatformChoice: state.platform,
    socialPostsMaterialsChoices: state.materialActions.join(", "),
  };
}

function ChoiceBubbles({
  options,
  value,
  values,
  onSelect,
  multi = false,
}: {
  options: readonly ChoiceOption[];
  value?: string;
  values?: readonly string[];
  onSelect: (label: string) => void;
  multi?: boolean;
}) {
  return (
    <div className="route-map-social-intake__chips" role="group">
      {options.map((option) => {
        const selected = multi
          ? Boolean(values?.includes(option.label))
          : value === option.label;
        return (
          <button
            key={option.label}
            type="button"
            className={`route-map-social-intake__chip${
              selected ? " route-map-social-intake__chip--selected" : ""
            }`}
            aria-pressed={selected}
            onClick={() => onSelect(option.label)}
          >
            <span>{option.label}</span>
            {option.detail ? <small>{option.detail}</small> : null}
          </button>
        );
      })}
    </div>
  );
}

function SocialPostsIntakeForm({
  job,
  initialDraftAnswers,
  onSaveDraft,
  onSubmit,
  onDraftStatusChange,
  submitError,
}: {
  job: RouteMapJob;
  initialDraftAnswers?: RouteMapIntakeAnswers | null;
  onSaveDraft?: (answers: RouteMapIntakeAnswers) => boolean;
  onSubmit: (answers: RouteMapIntakeAnswers) => boolean;
  onDraftStatusChange?: (status: "unsaved" | "saved" | "error") => void;
  submitError?: string | null;
}) {
  const restored = socialPostsStateFromAnswers(initialDraftAnswers);
  const [state, setState] = useState<SocialPostsIntakeState>(restored);
  const [fileSelection, setFileSelection] = useState<FileSelectionState | null>(() =>
    restored.fileName
      ? {
          kind: "selected",
          fileName: restored.fileName,
          message:
            "File name restored from your saved draft. The file itself is not stored. Choose the file again if you need a preview on this device.",
        }
      : null,
  );
  const [submitting, setSubmitting] = useState(false);

  function reportDraftStatus(status: "unsaved" | "saved" | "error") {
    onDraftStatusChange?.(status);
  }

  const completedCount = [
    state.purpose,
    state.action,
    state.platform,
    state.materialActions.length > 0 ? "materials" : "",
    state.requiredWording.trim(),
  ].filter(Boolean).length;
  const requiredChoicesComplete =
    Boolean(state.purpose) &&
    Boolean(state.action) &&
    Boolean(state.platform) &&
    state.materialActions.length > 0;
  const selectedPurpose = SOCIAL_PURPOSE_OPTIONS.find((option) => option.label === state.purpose);

  function updateField<Field extends keyof SocialPostsIntakeState>(
    field: Field,
    value: SocialPostsIntakeState[Field],
  ) {
    setState((current) => ({ ...current, [field]: value }));
    reportDraftStatus("unsaved");
  }

  function toggleMaterial(label: string) {
    setState((current) => {
      const hasLabel = current.materialActions.includes(label);
      const withoutLabel = current.materialActions.filter((entry) => entry !== label);
      const next =
        label === "I do not have these yet"
          ? hasLabel
            ? withoutLabel
            : [label]
          : hasLabel
            ? withoutLabel
            : [...withoutLabel.filter((entry) => entry !== "I do not have these yet"), label];
      return { ...current, materialActions: next };
    });
    reportDraftStatus("unsaved");
  }

  async function handleFileSelect(file: File | null) {
    if (!file) return;
    const mimeType = file.type || "application/octet-stream";
    updateField("fileName", file.name);
    updateField("fileMimeType", mimeType);
    setState((current) => ({
      ...current,
      materialActions: current.materialActions.includes("I do not have these yet")
        ? [SOCIAL_MATERIAL_PROVIDE_LOGO]
        : current.materialActions.length > 0
          ? current.materialActions
          : [SOCIAL_MATERIAL_PROVIDE_LOGO],
    }));

    if (file.size > SOCIAL_POSTS_FILE_PREVIEW_MAX_BYTES) {
      setFileSelection({
        kind: "error",
        fileName: file.name,
        message:
          "This file name is noted on your Project Intake. Preview is only available for files under 5 MB.",
      });
      return;
    }

    if (!mimeType.startsWith("image/")) {
      setFileSelection({
        kind: "selected",
        fileName: file.name,
        message:
          "File name noted on your Project Intake. Preview is not available for this file type. The file itself is not stored yet.",
      });
      return;
    }

    try {
      setFileSelection({
        kind: "selected",
        fileName: file.name,
        previewDataUrl: await readFileAsDataUrl(file),
        message:
          "File name noted on your Project Intake. The preview stays on this device only. The file itself is not stored yet.",
      });
    } catch {
      setFileSelection({
        kind: "error",
        fileName: file.name,
        message:
          "We could not preview this image. The file name is still noted on your Project Intake. The file itself is not stored yet.",
      });
    }
  }

  function handleSaveDraft() {
    const saved = onSaveDraft?.(buildSocialPostsAnswers(state)) ?? false;
    reportDraftStatus(saved ? "saved" : "error");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!requiredChoicesComplete) return;
    setSubmitting(true);
    reportDraftStatus("saved");
    const ok = onSubmit(buildSocialPostsAnswers(state));
    if (!ok) setSubmitting(false);
  }

  return (
    <section className="route-map-social-intake" aria-labelledby="route-map-intake-title">
      <div className="route-map-social-intake__header">
        <div>
          <p className="route-map-social-intake__eyebrow">Project Intake · Social Posts</p>
          <h2 id="route-map-intake-title" className="route-map-social-intake__title">
            Social Posts materials
          </h2>
          <p className="route-map-social-intake__lead">
            Answer the basics in plain language. If you do not have a logo, colors, or photos yet,
            choose that option and keep going. Submitting Project Intake does not start production.
          </p>
        </div>
        <div className="route-map-social-intake__progress" aria-live="polite">
          <strong>{completedCount} of 5</strong>
          <span>sections ready to submit</span>
        </div>
      </div>

      <form className="route-map-social-intake__form" onSubmit={handleSubmit}>
        <article className="route-map-social-intake__card route-map-social-intake__card--purpose">
          <p className="route-map-social-intake__step">1</p>
          <div className="route-map-social-intake__card-copy">
            <h3>What are these posts for?</h3>
            <p>Pick the closest reason. A short note is optional.</p>
          </div>
          <ChoiceBubbles
            options={SOCIAL_PURPOSE_OPTIONS}
            value={state.purpose}
            onSelect={(label) => updateField("purpose", label)}
          />
          <label className="route-map-social-intake__compact-field">
            <span>Optional detail</span>
            <textarea
              rows={2}
              value={state.purposeDetail}
              placeholder={selectedPurpose?.example ?? "Example: what you want people to know."}
              onChange={(event) => updateField("purposeDetail", event.target.value)}
            />
          </label>
        </article>

        <article className="route-map-social-intake__card route-map-social-intake__card--action">
          <p className="route-map-social-intake__step">2</p>
          <div className="route-map-social-intake__card-copy">
            <h3>What should people do after seeing it?</h3>
            <p>Choose one next step. Add a link, number, or destination only if it helps.</p>
          </div>
          <ChoiceBubbles
            options={SOCIAL_ACTION_OPTIONS}
            value={state.action}
            onSelect={(label) => updateField("action", label)}
          />
          {actionNeedsDestination(state.action) ? (
            <label className="route-map-social-intake__compact-field">
              <span>CTA or destination (optional)</span>
              <input
                type="text"
                value={state.actionDestination}
                placeholder={destinationPlaceholder(state.action)}
                onChange={(event) => updateField("actionDestination", event.target.value)}
              />
            </label>
          ) : null}
        </article>

        <article className="route-map-social-intake__card route-map-social-intake__card--platform">
          <p className="route-map-social-intake__step">3</p>
          <div className="route-map-social-intake__card-copy">
            <h3>What platform is this for?</h3>
            <p className="route-map-social-intake__platform-rule">
              Choose one platform for this set of four posts.
            </p>
            <p>You do not need to give us social account access.</p>
          </div>
          <ChoiceBubbles
            options={SOCIAL_PLATFORM_OPTIONS}
            value={state.platform}
            onSelect={(label) => updateField("platform", label)}
          />
        </article>

        <article className="route-map-social-intake__card route-map-social-intake__card--materials">
          <p className="route-map-social-intake__step">4</p>
          <div className="route-map-social-intake__card-copy">
            <h3>Brand materials</h3>
            <p>
              Describe the materials you have, note a file name, or share a link. Not having brand
              files yet will not block you from continuing.
            </p>
          </div>
          <ChoiceBubbles
            options={SOCIAL_MATERIAL_OPTIONS}
            values={state.materialActions}
            multi
            onSelect={toggleMaterial}
          />
          <div className="route-map-social-intake__upload-panel">
            <p className="route-map-social-intake__upload-heading">Brand references</p>
            <label className="route-map-secondary-btn route-map-social-intake__upload-btn">
              <span>Note a file name</span>
              <input
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg,.pdf,.doc,.docx,.txt"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void handleFileSelect(file);
                }}
              />
            </label>
            <p className="route-map-social-intake__upload-guidance">
              Optional. Choose a reference on your device so we can note its file name and type in
              your Project Intake answers. A website link or written note in the field below is
              often clearer.
            </p>
            <p className="route-map-social-intake__upload-privacy">
              Choosing a file does not store the file in your project. Only the file name and type
              are saved with your answers until a later materials step is available.
            </p>
          </div>
          {fileSelection ? (
            <div
              className={`route-map-social-intake__file-state route-map-social-intake__file-state--${fileSelection.kind}`}
              role={fileSelection.kind === "error" ? "alert" : "status"}
            >
              {fileSelection.previewDataUrl ? (
                <span
                  className="route-map-social-intake__file-preview"
                  aria-label={`Preview of ${fileSelection.fileName ?? "selected image"}`}
                  role="img"
                  style={{ backgroundImage: `url("${fileSelection.previewDataUrl}")` }}
                />
              ) : (
                <span className="route-map-social-intake__file-preview route-map-social-intake__file-preview--file">
                  File
                </span>
              )}
              <span>
                <strong>{fileSelection.fileName ?? "Selected file"}</strong>
                <small>{fileSelection.message}</small>
              </span>
            </div>
          ) : null}
          <label className="route-map-social-intake__compact-field">
            <span>Optional note about files, colors, links, or references</span>
            <textarea
              rows={2}
              value={state.materialNote}
              placeholder="Example: Use the photos from our website, or we do not have brand colors yet."
              onChange={(event) => updateField("materialNote", event.target.value)}
            />
          </label>
        </article>

        <article className="route-map-social-intake__card route-map-social-intake__card--wording">
          <p className="route-map-social-intake__step">5</p>
          <div className="route-map-social-intake__card-copy">
            <h3>Required wording or disclosures</h3>
            <p>
              Leave blank unless specific wording, legal language, dates, prices, or contact details
              must appear exactly.
            </p>
          </div>
          <label className="route-map-social-intake__compact-field route-map-social-intake__compact-field--wording">
            <span>Optional exact wording</span>
            <textarea
              rows={2}
              value={state.requiredWording}
              placeholder="Example: Offer ends July 31. New clients only."
              onChange={(event) => updateField("requiredWording", event.target.value)}
            />
          </label>
        </article>

        <div className="route-map-social-intake__actions">
          <div className="route-map-social-intake__next-step">
            <strong>Next Step</strong>
            <span>Save your progress or continue to your Studio Board Overview.</span>
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
            disabled={!requiredChoicesComplete || submitting}
          >
            SAVE &amp; CONTINUE TO YOUR STUDIO BOARD
          </button>
        </div>
        {submitError ? (
          <p className="route-map-social-intake__submit-error" role="alert">
            {submitError}
          </p>
        ) : null}
      </form>
      <p className="route-map-social-intake__next">
        Next: your Studio Board Overview opens with this Social Posts job and the details you
        shared. Submitting Project Intake does not start production.
      </p>
      <p className="route-map-social-intake__job">{job.name}</p>
    </section>
  );
}

function isSchemaFieldComplete(
  field: RouteMapIntakeField,
  value: string | undefined,
): boolean {
  if (field.role === "materials") {
    const parsed = parseMaterialsPathAnswer(value);
    return isMaterialsPathAnswerComplete(
      parsed.availability,
      parsed.detail,
      Boolean(field.required),
    );
  }
  const trimmed = String(value ?? "").trim();
  if (field.required) return trimmed.length > 0;
  return trimmed.length > 0;
}

export default function RouteMapIntakeForm({
  job,
  initialDraftAnswers = null,
  onSaveDraft,
  onSubmit,
  onDraftStatusChange,
  submitError = null,
  layout = "stacked",
}: Props) {
  const schema = useMemo(
    () => getRouteMapIntakeSchema(job.intakeType),
    [job.intakeType],
  );
  const [answers, setAnswers] = useState<RouteMapIntakeAnswers>(() =>
    schemaAnswersFromDraft(schema, initialDraftAnswers),
  );
  const [submitting, setSubmitting] = useState(false);

  const materialsFieldsComplete = schema.fields.every((field) => {
    if (field.role !== "materials") return true;
    const parsed = parseMaterialsPathAnswer(answers[field.id]);
    return isMaterialsPathAnswerComplete(
      parsed.availability,
      parsed.detail,
      Boolean(field.required),
    );
  });

  const requiredFieldsComplete = schema.fields.every((field) => {
    if (!field.required) return true;
    return isSchemaFieldComplete(field, answers[field.id]);
  });

  const completedSectionCount = schema.fields.filter((field) =>
    isSchemaFieldComplete(field, answers[field.id]),
  ).length;

  function markUnsaved() {
    onDraftStatusChange?.("unsaved");
  }

  function handleChange(fieldId: string, value: string) {
    markUnsaved();
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleMaterialsAvailability(field: RouteMapIntakeField, availability: string) {
    markUnsaved();
    const parsed = parseMaterialsPathAnswer(answers[field.id]);
    const detail = availability === INTAKE_MATERIALS_HAVE_NOW ? parsed.detail : "";
    setAnswers((prev) => ({
      ...prev,
      [field.id]: buildMaterialsPathAnswer(availability, detail),
    }));
  }

  function handleMaterialsDetail(field: RouteMapIntakeField, detail: string) {
    markUnsaved();
    setAnswers((prev) => ({
      ...prev,
      [field.id]: buildMaterialsPathAnswer(INTAKE_MATERIALS_HAVE_NOW, detail),
    }));
  }

  function handleSaveDraft() {
    const saved = onSaveDraft?.(answers) ?? false;
    onDraftStatusChange?.(saved ? "saved" : "error");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!materialsFieldsComplete || !requiredFieldsComplete) return;
    setSubmitting(true);
    const ok = onSubmit(answers);
    if (!ok) setSubmitting(false);
  }

  if (job.intakeType === SOCIAL_POSTS_INTAKE_TYPE) {
    return (
      <SocialPostsIntakeForm
        job={job}
        initialDraftAnswers={initialDraftAnswers}
        onSaveDraft={onSaveDraft}
        onSubmit={onSubmit}
        onDraftStatusChange={onDraftStatusChange}
        submitError={submitError}
      />
    );
  }

  if (layout === "cards") {
    return (
      <section className="route-map-social-intake" aria-labelledby="route-map-intake-title">
        <div className="route-map-social-intake__header">
          <div>
            <p className="route-map-social-intake__eyebrow">
              Project Intake · {job.name}
            </p>
            <h2 id="route-map-intake-title" className="route-map-social-intake__title">
              {schema.title.replace(/\s*Intake\s*$/i, "").trim() || schema.title}{" "}
              materials
            </h2>
            <p className="route-map-social-intake__lead">
              {schema.lead} Submitting Project Intake does not start production.
              {schema.clientResponsibilityNote
                ? ` ${schema.clientResponsibilityNote}`
                : ""}
            </p>
          </div>
          <div className="route-map-social-intake__progress" aria-live="polite">
            <strong>
              {completedSectionCount} of {schema.fields.length}
            </strong>
            <span>sections ready to submit</span>
          </div>
        </div>

        <form className="route-map-social-intake__form" onSubmit={handleSubmit}>
          {schema.fields.map((field, index) => {
            const step = index + 1;
            const requiredMark = field.required ? (
              <span className="route-map-intake__req">Required</span>
            ) : (
              <span className="route-map-intake__opt">Optional</span>
            );

            if (field.role === "materials") {
              const parsed = parseMaterialsPathAnswer(answers[field.id]);
              const describeOpen = parsed.availability === INTAKE_MATERIALS_HAVE_NOW;
              return (
                <article
                  key={field.id}
                  className="route-map-social-intake__card route-map-social-intake__card--materials"
                >
                  <p className="route-map-social-intake__step">{step}</p>
                  <div className="route-map-social-intake__card-copy">
                    <h3>
                      {field.label} {requiredMark}
                    </h3>
                    <p>
                      {field.hint ??
                        "Describe the materials you have, note a file name, or share a link. Not having brand files yet will not block you from continuing."}
                    </p>
                  </div>
                  <ChoiceBubbles
                    options={INTAKE_MATERIALS_AVAILABILITY_OPTIONS.map((label) => ({
                      label,
                    }))}
                    value={parsed.availability}
                    onSelect={(label) => handleMaterialsAvailability(field, label)}
                  />
                  {describeOpen ? (
                    <label className="route-map-social-intake__compact-field">
                      <span>Describe filenames, links, colors, or references</span>
                      <textarea
                        required={Boolean(field.required)}
                        rows={3}
                        placeholder={field.placeholder}
                        value={parsed.detail}
                        onChange={(event) =>
                          handleMaterialsDetail(field, event.target.value)
                        }
                      />
                    </label>
                  ) : null}
                </article>
              );
            }

            if (field.type === "select") {
              return (
                <article
                  key={field.id}
                  className="route-map-social-intake__card"
                >
                  <p className="route-map-social-intake__step">{step}</p>
                  <div className="route-map-social-intake__card-copy">
                    <h3>
                      {field.label} {requiredMark}
                    </h3>
                    {field.hint ? <p>{field.hint}</p> : null}
                  </div>
                  <ChoiceBubbles
                    options={(field.options ?? []).map((label) => ({ label }))}
                    value={answers[field.id] ?? ""}
                    onSelect={(label) => handleChange(field.id, label)}
                  />
                </article>
              );
            }

            return (
              <article key={field.id} className="route-map-social-intake__card">
                <p className="route-map-social-intake__step">{step}</p>
                <div className="route-map-social-intake__card-copy">
                  <h3>
                    {field.label} {requiredMark}
                  </h3>
                  {field.hint ? <p>{field.hint}</p> : null}
                </div>
                <label className="route-map-social-intake__compact-field">
                  <span className="sr-only">{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea
                      required={field.required}
                      rows={4}
                      placeholder={field.placeholder}
                      value={answers[field.id] ?? ""}
                      onChange={(event) =>
                        handleChange(field.id, event.target.value)
                      }
                    />
                  ) : (
                    <input
                      type="text"
                      required={field.required}
                      placeholder={field.placeholder}
                      value={answers[field.id] ?? ""}
                      onChange={(event) =>
                        handleChange(field.id, event.target.value)
                      }
                    />
                  )}
                </label>
              </article>
            );
          })}

          <div className="route-map-social-intake__actions">
            <div className="route-map-social-intake__next-step">
              <strong>Next Step</strong>
              <span>Save your progress or continue to your Studio Board Overview.</span>
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
              disabled={
                submitting || !materialsFieldsComplete || !requiredFieldsComplete
              }
            >
              SAVE &amp; CONTINUE TO YOUR STUDIO BOARD
            </button>
          </div>
          {submitError ? (
            <p className="route-map-social-intake__submit-error" role="alert">
              {submitError}
            </p>
          ) : null}
        </form>
        <p className="route-map-social-intake__next">
          Next: your Studio Board Overview opens with this job and the details you
          shared. Submitting Project Intake does not start production.
        </p>
        <p className="route-map-social-intake__job">{job.name}</p>
      </section>
    );
  }

  return (
    <section className="route-map-intake" aria-labelledby="route-map-intake-title">
      <p className="route-map-section-lead">Project Intake</p>
      <h2 id="route-map-intake-title" className="route-map-section-title">
        {schema.title}
      </h2>
      <p className="route-map-section-lead">{schema.lead}</p>
      <p className="route-map-section-lead">
        Submitting Project Intake does not start production. Share the details you have now. You can
        save a draft and return later through Studio Board.
      </p>
      {schema.clientResponsibilityNote ? (
        <p className="route-map-section-lead">{schema.clientResponsibilityNote}</p>
      ) : null}
      <p className="route-map-intake__job">{job.name}</p>

      <form className="route-map-intake__form" onSubmit={handleSubmit}>
        {schema.fields.map((field) => {
          const requiredMark = field.required ? (
            <span className="route-map-intake__req">Required</span>
          ) : (
            <span className="route-map-intake__opt">Optional</span>
          );

          if (field.role === "materials") {
            const parsed = parseMaterialsPathAnswer(answers[field.id]);
            const describeOpen = parsed.availability === INTAKE_MATERIALS_HAVE_NOW;
            return (
              <div key={field.id} className="route-map-intake__field route-map-intake__field--materials">
                <span className="route-map-intake__label" id={`intake-label-${field.id}`}>
                  {field.label} {requiredMark}
                </span>
                {field.hint ? (
                  <p className="route-map-intake__hint" id={`intake-hint-${field.id}`}>
                    {field.hint}
                  </p>
                ) : null}
                  <label className="route-map-intake__sublabel">
                    <span className="sr-only">Materials availability for {field.label}</span>
                  <select
                    required={field.required}
                    aria-labelledby={`intake-label-${field.id}`}
                    aria-describedby={field.hint ? `intake-hint-${field.id}` : undefined}
                    value={parsed.availability}
                    onChange={(event) => handleMaterialsAvailability(field, event.target.value)}
                  >
                    <option value="">Select an option</option>
                    {INTAKE_MATERIALS_AVAILABILITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {describeOpen ? (
                  <label className="route-map-intake__sublabel">
                    <span>Describe filenames, links, colors, or references</span>
                    <textarea
                      required={Boolean(field.required)}
                      rows={4}
                      placeholder={field.placeholder}
                      value={parsed.detail}
                      onChange={(event) => handleMaterialsDetail(field, event.target.value)}
                    />
                  </label>
                ) : null}
              </div>
            );
          }

          return (
            <label key={field.id} className="route-map-intake__field">
              <span className="route-map-intake__label">
                {field.label} {requiredMark}
              </span>
              {field.hint ? <span className="route-map-intake__hint">{field.hint}</span> : null}
              {field.type === "select" ? (
                <select
                  required={field.required}
                  value={answers[field.id] ?? ""}
                  onChange={(event) => handleChange(field.id, event.target.value)}
                >
                  <option value="">Select an option</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  rows={4}
                  placeholder={field.placeholder}
                  value={answers[field.id] ?? ""}
                  onChange={(event) => handleChange(field.id, event.target.value)}
                />
              ) : (
                <input
                  type="text"
                  required={field.required}
                  placeholder={field.placeholder}
                  value={answers[field.id] ?? ""}
                  onChange={(event) => handleChange(field.id, event.target.value)}
                />
              )}
            </label>
          );
        })}
        {submitError ? (
          <p className="route-map-intake__submit-error" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="route-map-intake__actions">
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
            disabled={submitting || !materialsFieldsComplete}
          >
            Submit Project Intake &amp; continue to Studio Board
          </button>
        </div>
      </form>
    </section>
  );
}
