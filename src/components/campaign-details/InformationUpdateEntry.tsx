"use client";

import { useMemo, useState } from "react";

import MaterialsIntakePanel from "@/components/materials/MaterialsIntakePanel";
import { studioBoard, type CampaignRecord } from "@/config/studio-board";
import { DIRECT_APPLY_TARGET_KEYS, FREEFORM_REQUEST_TARGET_KEYS, requestTargetLabel } from "@/lib/customer-field-tokens";
import type { RequestTargetKey } from "@/lib/customer-field-tokens";

const copy = studioBoard.campaignDetails.informationUpdate;

type UiTargetKey = RequestTargetKey | "logo_material" | "photo_material" | "document_material" | "reference_url";

const MATERIAL_UI_KEYS = new Set<UiTargetKey>([
  "logo_material",
  "photo_material",
  "document_material",
  "reference_url",
]);

type Props = {
  campaign: CampaignRecord;
  onSubmitted: () => void;
};

type Step = "choose" | "form" | "materials" | "confirm";

function isMaterialUiKey(value: string): value is UiTargetKey {
  return MATERIAL_UI_KEYS.has(value as UiTargetKey);
}

function displayTargetLabel(targetKey: UiTargetKey): string {
  if (isMaterialUiKey(targetKey)) {
    const labels: Record<string, string> = {
      logo_material: "Logo file",
      photo_material: "Photo or image",
      document_material: "Supporting document",
      reference_url: "Reference URL",
    };
    return labels[targetKey] ?? targetKey;
  }
  return requestTargetLabel(targetKey);
}

export default function InformationUpdateEntry({ campaign, onSubmitted }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [targetKey, setTargetKey] = useState<UiTargetKey | "">("");
  const [requestedValue, setRequestedValue] = useState("");
  const [note, setNote] = useState("");
  const [confirmDisclaimer, setConfirmDisclaimer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const idempotencyKey = useMemo(() => crypto.randomUUID(), [targetKey, requestedValue, note, step]);

  const fieldOptions = useMemo(
    () => [
      ...DIRECT_APPLY_TARGET_KEYS.map((key) => ({ key, label: requestTargetLabel(key) })),
      ...FREEFORM_REQUEST_TARGET_KEYS.map((key) => ({ key, label: requestTargetLabel(key) })),
      { key: "logo_material" as UiTargetKey, label: "Logo file" },
      { key: "photo_material" as UiTargetKey, label: "Photo or image" },
      { key: "document_material" as UiTargetKey, label: "Supporting document" },
      { key: "reference_url" as UiTargetKey, label: "Reference URL" },
    ],
    [],
  );

  async function submitRequest() {
    if (!targetKey || !confirmDisclaimer || isMaterialUiKey(targetKey)) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.campaignId}/project-activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_request",
          idempotencyKey,
          targetKey,
          requestedValue,
          note: note || undefined,
          confirmScopeDisclaimer: true,
        }),
      });
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not submit request.");
        return;
      }
      setMessage(body.message ?? copy.requestReceived);
      setStep("choose");
      setTargetKey("");
      setRequestedValue("");
      setNote("");
      setConfirmDisclaimer(false);
      onSubmitted();
    } catch {
      setError("Could not submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "materials") {
    return (
      <div className="cd-information-update">
        <button type="button" className="utility-btn utility-btn--secondary" onClick={() => setStep("choose")}>
          ← {copy.backLabel}
        </button>
        <MaterialsIntakePanel campaign={campaign} onSubmitted={onSubmitted} />
      </div>
    );
  }

  return (
    <section className="utility-card cd-card--information-update" aria-labelledby="cd-information-update-title">
      <h2 id="cd-information-update-title" className="utility-card__title">
        {copy.title}
      </h2>
      <p className="cd-journey__lead">{copy.lead}</p>

      {step === "choose" ? (
        <>
          <label className="cd-information-update__label" htmlFor="iu-target">
            {copy.prompt}
          </label>
          <select
            id="iu-target"
            className="cd-information-update__select"
            value={targetKey}
            onChange={(e) => {
              const value = e.target.value;
              setTargetKey(value as UiTargetKey | "");
              if (isMaterialUiKey(value)) {
                setStep("materials");
              } else if (value) {
                setStep("form");
              }
            }}
          >
            <option value="">Select an update type</option>
            {fieldOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {step === "form" && targetKey ? (
        <div className="cd-information-update__form">
          <p className="cd-information-update__target">
            {displayTargetLabel(targetKey)}
          </p>
          <label className="cd-information-update__label" htmlFor="iu-value">
            {copy.newValueLabel}
          </label>
          <textarea
            id="iu-value"
            className="cd-information-update__textarea"
            value={requestedValue}
            onChange={(e) => setRequestedValue(e.target.value)}
            rows={3}
          />
          <label className="cd-information-update__label" htmlFor="iu-note">
            {copy.noteLabel}
          </label>
          <textarea
            id="iu-note"
            className="cd-information-update__textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
          <label className="cd-information-update__confirm">
            <input
              type="checkbox"
              checked={confirmDisclaimer}
              onChange={(e) => setConfirmDisclaimer(e.target.checked)}
            />
            {copy.scopeDisclaimer}
          </label>
          <div className="cd-information-update__actions">
            <button type="button" className="utility-btn utility-btn--secondary" onClick={() => setStep("choose")}>
              {copy.backLabel}
            </button>
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={!requestedValue.trim() || !confirmDisclaimer || submitting}
              onClick={() => setStep("confirm")}
            >
              {copy.reviewLabel}
            </button>
          </div>
        </div>
      ) : null}

      {step === "confirm" && targetKey ? (
        <div className="cd-information-update__confirm-panel">
          <p className="cd-information-update__target">
            {displayTargetLabel(targetKey)}
          </p>
          <p className="cd-information-update__review-value">{requestedValue}</p>
          {note ? <p className="cd-information-update__review-note">{note}</p> : null}
          <p className="cd-updates__hint">{copy.reviewHint}</p>
          <div className="cd-information-update__actions">
            <button type="button" className="utility-btn utility-btn--secondary" onClick={() => setStep("form")}>
              {copy.backLabel}
            </button>
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={submitting}
              onClick={() => void submitRequest()}
            >
              {submitting ? copy.submittingLabel : copy.submitLabel}
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="cd-information-update__success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="cd-information-update__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
