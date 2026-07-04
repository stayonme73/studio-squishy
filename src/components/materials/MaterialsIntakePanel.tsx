"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { materialsConfig } from "@/config/materials";
import type { CampaignRecord } from "@/config/studio-board";
import type {
  ClientConsolidatedRequest,
  ClientOptionalRequest,
} from "@/lib/materials/client-requests";
import type { ClientSubmitPayload } from "@/lib/materials/payload-validation";
import type { MaterialContentKind } from "@/lib/materials/types";

type MaterialsClientResponse = {
  blockingRequiredCount: number;
  clientIntakeCount?: number;
  consolidatedRequests?: ClientConsolidatedRequest[];
  optionalRequests?: ClientOptionalRequest[];
  syncedAt?: string;
  error?: string;
};

type FileSelectionState = {
  kind: "selected" | "error";
  fileName?: string;
  mimeType?: string;
  previewDataUrl?: string;
  message: string;
};

type MaterialsIntakePanelProps = {
  campaign: CampaignRecord;
};

const MATERIALS_IMAGE_PREVIEW_MAX_BYTES = 5 * 1024 * 1024;

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

function payloadFieldsForKind(contentKind: MaterialContentKind): Array<keyof ClientSubmitPayload> {
  switch (contentKind) {
    case "url":
      return ["url", "note"];
    case "file-metadata":
      return ["fileName", "mimeType", "note"];
    case "confirmation":
    case "text":
    default:
      return ["text", "note"];
  }
}

function fieldLabel(field: keyof ClientSubmitPayload): string {
  switch (field) {
    case "url":
      return "URL";
    case "fileName":
      return "File name or description";
    case "mimeType":
      return "File type (optional)";
    case "text":
      return "Details";
    case "note":
      return "Note (optional)";
    default:
      return field;
  }
}

function formatReceivedStatus(submittedAt: string | undefined): string {
  if (!submittedAt) return "Received";
  const parsed = new Date(submittedAt);
  if (Number.isNaN(parsed.getTime())) return "Received";
  return `Received ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)}`;
}

function SubmitFields({
  contentKind,
  values,
  onChange,
  fileSelection,
  onFileSelect,
  disabled,
}: {
  contentKind: MaterialContentKind;
  values: ClientSubmitPayload;
  onChange: (field: keyof ClientSubmitPayload, value: string) => void;
  fileSelection?: FileSelectionState;
  onFileSelect: (file: File | null) => void;
  disabled: boolean;
}) {
  const fields = payloadFieldsForKind(contentKind);
  return (
    <div className="sb-materials-intake__fields">
      {contentKind === "file-metadata" ? (
        <div className="sb-materials-intake__file-picker">
          <label className="utility-btn utility-btn--secondary sb-materials-intake__file-button">
            <span>Choose file</span>
            <input
              className="sb-materials-intake__file-input"
              type="file"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg,.pdf,.doc,.docx,.txt,.mp3,.wav,.mp4"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                onFileSelect(file);
              }}
            />
          </label>
          {fileSelection ? (
            <div
              className={`sb-materials-intake__file-state sb-materials-intake__file-state--${fileSelection.kind}`}
              role={fileSelection.kind === "error" ? "alert" : "status"}
            >
              {fileSelection.previewDataUrl ? (
                <span
                  className="sb-materials-intake__file-thumb"
                  role="img"
                  aria-label={`Preview of ${fileSelection.fileName ?? "selected image"}`}
                  style={{ backgroundImage: `url("${fileSelection.previewDataUrl}")` }}
                />
              ) : (
                <span className="sb-materials-intake__file-thumb sb-materials-intake__file-thumb--file">
                  File
                </span>
              )}
              <span className="sb-materials-intake__file-copy">
                <strong>{fileSelection.fileName ?? "File selection"}</strong>
                <span>{fileSelection.message}</span>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
      {fields.map((field) => (
        <label key={field} className="sb-materials-intake__field">
          <span className="sb-materials-intake__field-label">{fieldLabel(field)}</span>
          {field === "text" || field === "note" ? (
            <textarea
              className="sb-materials-intake__input"
              rows={field === "text" ? 3 : 2}
              value={values[field] ?? ""}
              disabled={disabled}
              onChange={(event) => onChange(field, event.target.value)}
            />
          ) : (
            <input
              className="sb-materials-intake__input"
              type={field === "url" ? "url" : "text"}
              value={values[field] ?? ""}
              disabled={disabled}
              onChange={(event) => onChange(field, event.target.value)}
            />
          )}
        </label>
      ))}
    </div>
  );
}

export default function MaterialsIntakePanel({ campaign }: MaterialsIntakePanelProps) {
  const [data, setData] = useState<MaterialsClientResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ClientSubmitPayload>>({});
  const [fileSelections, setFileSelections] = useState<Record<string, FileSelectionState>>({});
  const materialsEndpoint = `/api/campaigns/${encodeURIComponent(campaign.campaignId)}/materials?audience=client`;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(materialsEndpoint);
      const json = (await res.json()) as MaterialsClientResponse;
      if (!res.ok) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }
      setData(json);
      window.dispatchEvent(new Event("studio-squishy:campaign-updated"));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load materials.");
    } finally {
      setLoading(false);
    }
  }, [materialsEndpoint]);

  const paidCampaign = Boolean(campaign.paymentReceivedAt);

  useEffect(() => {
    if (paidCampaign) void refresh();
  }, [paidCampaign, refresh]);

  const consolidated = data?.consolidatedRequests ?? [];
  const optional = data?.optionalRequests ?? [];
  const blockingCount =
    data?.blockingRequiredCount ?? campaign.materialsSummary?.blockingRequiredCount ?? 0;
  const intakeCount = data?.clientIntakeCount ?? blockingCount;

  const showPanel = useMemo(() => {
    if (campaign.projectDetailsSubmittedAt) return true;
    if (intakeCount > 0) return true;
    if (consolidated.length > 0 || optional.length > 0) return true;
    if (paidCampaign && loading) return true;
    return false;
  }, [
    blockingCount,
    campaign.projectDetailsSubmittedAt,
    consolidated.length,
    intakeCount,
    loading,
    optional.length,
    paidCampaign,
  ]);

  const updateDraft = (id: string, field: keyof ClientSubmitPayload, value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  };

  const selectFile = async (id: string, file: File | null) => {
    if (!file) return;
    if (file.size > MATERIALS_IMAGE_PREVIEW_MAX_BYTES) {
      setFileSelections((current) => ({
        ...current,
        [id]: {
          kind: "error",
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          message: "This file is too large. Please choose a file under 5 MB.",
        },
      }));
      return;
    }

    const mimeType = file.type || "application/octet-stream";
    updateDraft(id, "fileName", file.name);
    updateDraft(id, "mimeType", mimeType);

    if (!mimeType.startsWith("image/")) {
      setFileSelections((current) => ({
        ...current,
        [id]: {
          kind: "selected",
          fileName: file.name,
          mimeType,
          message: "File selected locally. Preview is not available for this file type.",
        },
      }));
      return;
    }

    try {
      const previewDataUrl = await readFileAsDataUrl(file);
      setFileSelections((current) => ({
        ...current,
        [id]: {
          kind: "selected",
          fileName: file.name,
          mimeType,
          previewDataUrl,
          message: "Image selected locally. Send to Studio when you are ready.",
        },
      }));
    } catch {
      setFileSelections((current) => ({
        ...current,
        [id]: {
          kind: "error",
          fileName: file.name,
          mimeType,
          message: "We could not preview this image. Please choose another PNG or JPG.",
        },
      }));
    }
  };

  const submitConsolidated = async (request: ClientConsolidatedRequest) => {
    setSubmittingId(request.id);
    setError(null);
    setSuccessId(null);
    try {
      const res = await fetch(materialsEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "client_submit_consolidated",
          consolidatedItemId: request.id,
          payload: drafts[request.id] ?? {},
        }),
      });
      const json = (await res.json()) as MaterialsClientResponse;
      if (!res.ok) throw new Error(json.error ?? `Submit failed (${res.status})`);
      setData(json);
      setSuccessId(request.id);
      window.dispatchEvent(new Event("studio-squishy:campaign-updated"));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Submit failed.");
    } finally {
      setSubmittingId(null);
    }
  };

  const submitOptional = async (request: ClientOptionalRequest) => {
    setSubmittingId(request.id);
    setError(null);
    setSuccessId(null);
    try {
      const res = await fetch(materialsEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "client_submit",
          itemId: request.id,
          payload: drafts[request.id] ?? {},
        }),
      });
      const json = (await res.json()) as MaterialsClientResponse;
      if (!res.ok) throw new Error(json.error ?? `Submit failed (${res.status})`);
      setData(json);
      setSuccessId(request.id);
      window.dispatchEvent(new Event("studio-squishy:campaign-updated"));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Submit failed.");
    } finally {
      setSubmittingId(null);
    }
  };

  if (!showPanel) return null;

  return (
    <article
      className="sb-card sb-card--materials bf-material bf-material-paper"
      aria-labelledby="sb-materials-intake-title"
    >
      <p className="sb-card__tab">{materialsConfig.intakePanelTitle}</p>
      <div className="sb-materials-intake">
        <h2 id="sb-materials-intake-title" className="sr-only">
          {materialsConfig.intakePanelTitle}
        </h2>

        {loading ? (
          <p className="sb-materials-intake__meta" aria-busy="true">
            Loading materials…
          </p>
        ) : null}

        {error ? (
          <p className="sb-materials-intake__error" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && consolidated.length === 0 && blockingCount === 0 ? (
          <p className="sb-materials-intake__meta">
            <strong>{materialsConfig.intakePanelCompleteTitle}</strong>{" "}
            {materialsConfig.intakePanelCompleteBody}
          </p>
        ) : null}

        {!loading && consolidated.length === 0 && blockingCount > 0 ? (
          <p className="sb-materials-intake__meta" role="status">
            We are syncing the required materials for this campaign. Refresh the Board in a moment
            if the request list does not appear.
          </p>
        ) : null}

        {!loading && consolidated.length > 0 ? (
          <>
            <p className="sb-materials-intake__lead">{materialsConfig.intakePanelBody}</p>
            <ul className="sb-materials-intake__list">
              {consolidated.map((request) => {
                return (
                  <li key={request.id} className="sb-materials-intake__item">
                    <div className="sb-materials-intake__item-head">
                      <div className="sb-materials-intake__item-title-row">
                        <p className="sb-materials-intake__prompt">{request.prompt}</p>
                        {request.isPendingReview ? (
                          <div className="sb-materials-intake__status-stack">
                            <span className="sb-materials-intake__status sb-materials-intake__status--pending">
                              {formatReceivedStatus(request.submittedAt)}
                            </span>
                            <p className="sb-materials-intake__pending" role="status">
                              {materialsConfig.clientUnderReviewBody}
                            </p>
                          </div>
                        ) : (
                          <span
                            className={`sb-materials-intake__status${
                              request.reviewStatus === "needs_clarification"
                                ? " sb-materials-intake__status--action"
                                : ""
                            }`}
                          >
                            {request.statusLabel}
                          </span>
                        )}
                      </div>
                      <p className="sb-materials-intake__reason">{request.reason}</p>
                      {request.reviewStatus === "needs_clarification" ? (
                        <p className="sb-materials-intake__clarify" role="status">
                          {materialsConfig.clientNeedsClarificationBody}
                        </p>
                      ) : null}
                    </div>
                    {request.canSubmit ? (
                      <>
                        <SubmitFields
                          contentKind={request.contentKind}
                          values={drafts[request.id] ?? {}}
                          onChange={(field, value) => updateDraft(request.id, field, value)}
                          fileSelection={fileSelections[request.id]}
                          onFileSelect={(file) => void selectFile(request.id, file)}
                          disabled={submittingId === request.id}
                        />
                        <button
                          type="button"
                          className="utility-btn utility-btn--primary sb-materials-intake__submit"
                          disabled={submittingId === request.id}
                          onClick={() => void submitConsolidated(request)}
                        >
                          {materialsConfig.clientSubmitLabel}
                        </button>
                        {successId === request.id ? (
                          <p className="sb-materials-intake__success" role="status">
                            {materialsConfig.clientSubmitSuccess}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {!loading && optional.length > 0 ? (
          <div className="sb-materials-intake__optional">
            <button
              type="button"
              className="sb-materials-intake__toggle"
              aria-expanded={showOptional}
              onClick={() => setShowOptional((open) => !open)}
            >
              {materialsConfig.addMoreLabel}
            </button>
            {showOptional ? (
              <ul className="sb-materials-intake__list">
                {optional.map((request) => (
                  <li key={request.id} className="sb-materials-intake__item">
                    <div className="sb-materials-intake__item-head">
                      <div className="sb-materials-intake__item-title-row">
                        <p className="sb-materials-intake__prompt">{request.label}</p>
                        {request.isPendingReview ? (
                          <div className="sb-materials-intake__status-stack">
                            <span className="sb-materials-intake__status sb-materials-intake__status--pending">
                              {formatReceivedStatus(request.submittedAt)}
                            </span>
                            <p className="sb-materials-intake__pending" role="status">
                              {materialsConfig.clientUnderReviewBody}
                            </p>
                          </div>
                        ) : (
                          <span
                            className={`sb-materials-intake__status${
                              request.reviewStatus === "needs_clarification"
                                ? " sb-materials-intake__status--action"
                                : ""
                            }`}
                          >
                            {request.statusLabel}
                          </span>
                        )}
                      </div>
                      <p className="sb-materials-intake__reason">Needed for {request.reason}</p>
                      {request.reviewStatus === "needs_clarification" ? (
                        <p className="sb-materials-intake__clarify" role="status">
                          {materialsConfig.clientNeedsClarificationBody}
                        </p>
                      ) : null}
                    </div>
                    {request.canSubmit ? (
                      <>
                        <SubmitFields
                          contentKind={request.contentKind}
                          values={drafts[request.id] ?? {}}
                          onChange={(field, value) => updateDraft(request.id, field, value)}
                          fileSelection={fileSelections[request.id]}
                          onFileSelect={(file) => void selectFile(request.id, file)}
                          disabled={submittingId === request.id}
                        />
                        <button
                          type="button"
                          className="utility-btn sb-materials-intake__submit"
                          disabled={submittingId === request.id}
                          onClick={() => void submitOptional(request)}
                        >
                          {materialsConfig.clientSubmitLabel}
                        </button>
                        {successId === request.id ? (
                          <p className="sb-materials-intake__success" role="status">
                            {materialsConfig.clientSubmitSuccess}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
