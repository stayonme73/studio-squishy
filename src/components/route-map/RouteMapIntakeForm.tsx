"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  getRouteMapIntakeSchema,
  type RouteMapIntakeAnswers,
} from "@/config/route-map-intake-v1";
import type { RouteMapJob } from "@/config/route-map-v1";

type Props = {
  job: RouteMapJob;
  /** When true, intake includes Post/Publish platform/access fields. */
  postPublishAddon?: boolean;
  onSaveDraft?: (answers: RouteMapIntakeAnswers) => boolean;
  onSubmit: (answers: RouteMapIntakeAnswers) => void;
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
  { label: "Upload a logo" },
  { label: "Upload photos" },
  { label: "Share a past post" },
  { label: "Share a website or social link" },
  { label: "I do not have these yet" },
];

const EMPTY_SOCIAL_POSTS_STATE: SocialPostsIntakeState = {
  purpose: "",
  purposeDetail: "",
  action: "",
  actionDestination: "",
  platform: "",
  materialActions: [],
  materialNote: "",
  requiredWording: "",
  fileName: "",
  fileMimeType: "",
};

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
  onSaveDraft,
  onSubmit,
}: {
  job: RouteMapJob;
  onSaveDraft?: (answers: RouteMapIntakeAnswers) => boolean;
  onSubmit: (answers: RouteMapIntakeAnswers) => void;
}) {
  const [state, setState] = useState<SocialPostsIntakeState>(EMPTY_SOCIAL_POSTS_STATE);
  const [fileSelection, setFileSelection] = useState<FileSelectionState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"unsaved" | "saved" | "error">("unsaved");

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
    setSaveStatus("unsaved");
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
    setSaveStatus("unsaved");
  }

  async function handleFileSelect(file: File | null) {
    if (!file) return;
    const mimeType = file.type || "application/octet-stream";
    updateField("fileName", file.name);
    updateField("fileMimeType", mimeType);
    setState((current) => ({
      ...current,
      materialActions: current.materialActions.includes("I do not have these yet")
        ? ["Upload a logo"]
        : current.materialActions.length > 0
          ? current.materialActions
          : ["Upload a logo"],
    }));

    if (file.size > SOCIAL_POSTS_FILE_PREVIEW_MAX_BYTES) {
      setFileSelection({
        kind: "error",
        fileName: file.name,
        message: "This file is selected, but preview is only available under 5 MB.",
      });
      return;
    }

    if (!mimeType.startsWith("image/")) {
      setFileSelection({
        kind: "selected",
        fileName: file.name,
        message: "File selected. Preview is not available for this file type.",
      });
      return;
    }

    try {
      setFileSelection({
        kind: "selected",
        fileName: file.name,
        previewDataUrl: await readFileAsDataUrl(file),
        message: "Image selected. We will save the file name with your intake.",
      });
    } catch {
      setFileSelection({
        kind: "error",
        fileName: file.name,
        message: "We could not preview this image, but the file name is saved with your intake.",
      });
    }
  }

  function handleSaveDraft() {
    const saved = onSaveDraft?.(buildSocialPostsAnswers(state)) ?? false;
    setSaveStatus(saved ? "saved" : "error");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!requiredChoicesComplete) return;
    setSubmitting(true);
    setSaveStatus("saved");
    onSubmit(buildSocialPostsAnswers(state));
  }

  return (
    <section className="route-map-social-intake" aria-labelledby="route-map-intake-title">
      <div className="route-map-social-intake__header">
        <div>
          <p className="route-map-social-intake__eyebrow">Step 1 of 1: Tell us what you need</p>
          <h2 id="route-map-intake-title" className="route-map-social-intake__title">
            Social Posts materials
          </h2>
          <p className="route-map-social-intake__lead">
            Answer the basics in plain language. If you do not have a logo, colors, or photos yet,
            choose that option and keep going.
          </p>
        </div>
        <div className="route-map-social-intake__progress" aria-live="polite">
          <strong>{completedCount} of 5</strong>
          <span>materials ready to send</span>
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
            <p>Send what you have. Not having brand files yet will not block you from continuing.</p>
          </div>
          <ChoiceBubbles
            options={SOCIAL_MATERIAL_OPTIONS}
            values={state.materialActions}
            multi
            onSelect={toggleMaterial}
          />
          <div className="route-map-social-intake__upload-row">
            <label className="route-map-secondary-btn route-map-social-intake__upload-btn">
              <span>Upload logo/photos/reference</span>
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
            <p>
              Files are added privately to your Studio project and visible only to your Studio
              team.
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

        <div className="route-map-social-intake__actions" aria-live="polite">
          <div className="route-map-social-intake__save-state">
            <strong>{saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Not saved" : "Unsaved changes"}</strong>
            <span>
              {saveStatus === "saved"
                ? "Your work is saved."
                : saveStatus === "error"
                  ? "We could not save yet. Try again."
                  : "Choose Save Draft or continue when ready."}
            </span>
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
      </form>
      <p className="route-map-social-intake__next">
        Next: your Studio Board opens with this Social Posts job and the details you shared.
      </p>
      <p className="route-map-social-intake__job">{job.name}</p>
    </section>
  );
}

export default function RouteMapIntakeForm({
  job,
  postPublishAddon = false,
  onSaveDraft,
  onSubmit,
}: Props) {
  const schema = useMemo(
    () => getRouteMapIntakeSchema(job.intakeType, { includePostPublish: postPublishAddon }),
    [job.intakeType, postPublishAddon],
  );
  const [answers, setAnswers] = useState<RouteMapIntakeAnswers>(() =>
    Object.fromEntries(schema.fields.map((field) => [field.id, ""])),
  );
  const [submitting, setSubmitting] = useState(false);

  function handleChange(fieldId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    onSubmit(answers);
  }

  if (job.intakeType === SOCIAL_POSTS_INTAKE_TYPE) {
    return <SocialPostsIntakeForm job={job} onSaveDraft={onSaveDraft} onSubmit={onSubmit} />;
  }

  return (
    <section className="route-map-intake" aria-labelledby="route-map-intake-title">
      <h2 id="route-map-intake-title" className="route-map-section-title">
        {schema.title}
      </h2>
      <p className="route-map-section-lead">{schema.lead}</p>
      {schema.clientResponsibilityNote ? (
        <p className="route-map-section-lead">{schema.clientResponsibilityNote}</p>
      ) : null}
      <p className="route-map-intake__job">{job.name}</p>

      <form className="route-map-intake__form" onSubmit={handleSubmit}>
        {schema.fields.map((field) => (
          <label key={field.id} className="route-map-intake__field">
            <span className="route-map-intake__label">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            {field.type === "select" ? (
              <select
                required={field.required}
                value={answers[field.id] ?? ""}
                onChange={(event) => handleChange(field.id, event.target.value)}
              >
                <option value="">Select…</option>
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
        ))}

        <button type="submit" className="route-map-primary-btn" disabled={submitting}>
          Submit intake &amp; open Project Record
        </button>
      </form>
    </section>
  );
}
