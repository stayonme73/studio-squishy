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

type MaterialsIntakePanelProps = {
  campaign: CampaignRecord;
};

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

function SubmitFields({
  contentKind,
  values,
  onChange,
  disabled,
}: {
  contentKind: MaterialContentKind;
  values: ClientSubmitPayload;
  onChange: (field: keyof ClientSubmitPayload, value: string) => void;
  disabled: boolean;
}) {
  const fields = payloadFieldsForKind(contentKind);
  return (
    <div className="sb-materials-intake__fields">
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
                              {request.statusLabel}
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
                              {request.statusLabel}
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
