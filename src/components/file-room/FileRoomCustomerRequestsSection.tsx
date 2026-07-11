"use client";

import { useCallback, useEffect, useState } from "react";

import { fileRoom } from "@/config/file-room";
import type { InformationUpdateRequest } from "@/lib/project-activity/types";

import FileRoomSectionCard from "./FileRoomSectionCard";

type FileRoomCustomerRequestsSectionProps = {
  campaignId: string;
  canReview: boolean;
};

type ActivityResponse = {
  requests?: InformationUpdateRequest[];
  error?: string;
};

const OPEN_STATUSES = new Set([
  "request_received",
  "needs_studio_review",
  "needs_clarification",
  "approved_for_apply",
  "held",
]);

function statusLabel(status: InformationUpdateRequest["status"]): string {
  const labels: Record<InformationUpdateRequest["status"], string> = {
    request_received: "Request received",
    needs_studio_review: "Needs Studio review",
    needs_clarification: "Needs clarification",
    approved_for_apply: "Approved for apply",
    applied: "Applied",
    rejected: "Rejected",
    held: "Held — project change",
  };
  return labels[status];
}

function RequestRow({
  campaignId,
  request,
  onUpdated,
}: {
  campaignId: string;
  request: InformationUpdateRequest;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const patchRequest = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/project-activity/${request.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = (await res.json()) as { error?: string; conflict?: boolean };
      if (!res.ok) {
        throw new Error(
          json.conflict
            ? "Official value changed since this request was submitted."
            : (json.error ?? `Request update failed (${res.status})`),
        );
      }
      onUpdated();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Request update failed.");
    } finally {
      setBusy(false);
    }
  };

  const canClassify =
    request.status === "request_received" ||
    request.status === "needs_studio_review" ||
    request.status === "needs_clarification";
  const canApply = request.status === "approved_for_apply";
  const canEscalate =
    request.status === "held" &&
    request.classification === "project_change" &&
    !request.projectChangeExceptionId;
  const canReject = request.status !== "applied" && request.status !== "rejected";

  return (
    <li className="fr-customer-request">
      <div className="fr-customer-request__head">
        <span className="fr-customer-request__target">{request.targetLabel}</span>
        <span className="fr-customer-request__status">{statusLabel(request.status)}</span>
      </div>
      <p className="fr-customer-request__meta">
        Submitted {new Date(request.submittedAt).toLocaleString()}
        {request.submittedBy.displayName ? ` by ${request.submittedBy.displayName}` : ""}
      </p>
      {request.previousValueCaptured != null ? (
        <p className="fr-customer-request__value">
          {request.previousValueCaptured} → {request.requestedValue}
        </p>
      ) : (
        <p className="fr-customer-request__value">{request.requestedValue}</p>
      )}
      {request.note ? <p className="fr-customer-request__note">{request.note}</p> : null}
      {request.suggestedClassification ? (
        <p className="fr-customer-request__hint">
          Suggested: {request.suggestedClassification === "project_change" ? "Project change" : "Information update"}
        </p>
      ) : null}
      {request.classification ? (
        <p className="fr-customer-request__hint">
          Classification: {request.classification === "project_change" ? "Project change" : "Information update"}
        </p>
      ) : null}
      {request.projectChangeExceptionId ? (
        <p className="fr-customer-request__hint">
          {fileRoom.customerRequests.escalatedLabel} — exception {request.projectChangeExceptionId.slice(0, 8)}
        </p>
      ) : null}

      {canClassify ? (
        <div className="fr-customer-request__actions">
          <button
            type="button"
            className="utility-btn utility-btn--primary"
            disabled={busy}
            onClick={() => void patchRequest({ action: "classify", classification: "information_update" })}
          >
            {fileRoom.customerRequests.classifyInformationUpdate}
          </button>
          <button
            type="button"
            className="utility-btn"
            disabled={busy}
            onClick={() => void patchRequest({ action: "classify", classification: "project_change" })}
          >
            {fileRoom.customerRequests.classifyProjectChange}
          </button>
        </div>
      ) : null}

      {canEscalate ? (
        <div className="fr-customer-request__actions">
          <button
            type="button"
            className="utility-btn utility-btn--primary"
            disabled={busy}
            onClick={() => void patchRequest({ action: "escalate" })}
          >
            {fileRoom.customerRequests.escalateLabel}
          </button>
        </div>
      ) : null}

      {canApply ? (
        <div className="fr-customer-request__actions">
          <button
            type="button"
            className="utility-btn utility-btn--primary"
            disabled={busy}
            onClick={() => void patchRequest({ action: "apply" })}
          >
            {fileRoom.customerRequests.applyLabel}
          </button>
        </div>
      ) : null}

      {canReject ? (
        <div className="fr-customer-request__reject">
          {showReject ? (
            <>
              <label className="fr-customer-request__reject-label">
                <span>{fileRoom.customerRequests.rejectReasonLabel}</span>
                <textarea
                  className="fr-customer-request__reject-input"
                  rows={2}
                  value={rejectReason}
                  disabled={busy}
                  onChange={(event) => setRejectReason(event.target.value)}
                />
              </label>
              <div className="fr-customer-request__actions">
                <button
                  type="button"
                  className="utility-btn"
                  disabled={busy}
                  onClick={() => setShowReject(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="utility-btn utility-btn--danger"
                  disabled={busy || !rejectReason.trim()}
                  onClick={() =>
                    void patchRequest({ action: "reject", customerReason: rejectReason.trim() })
                  }
                >
                  {fileRoom.customerRequests.rejectLabel}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="utility-btn"
              disabled={busy}
              onClick={() => setShowReject(true)}
            >
              {fileRoom.customerRequests.rejectLabel}
            </button>
          )}
        </div>
      ) : null}

      {error ? (
        <p className="fr-customer-request__error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export default function FileRoomCustomerRequestsSection({
  campaignId,
  canReview,
}: FileRoomCustomerRequestsSectionProps) {
  const [requests, setRequests] = useState<InformationUpdateRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!canReview) {
      setRequests([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/project-activity`);
      const body = (await res.json()) as ActivityResponse;
      if (!res.ok) throw new Error(body.error ?? "Could not load customer requests.");
      setRequests(body.requests ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load customer requests.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, canReview]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!canReview) return null;

  const openRequests = requests.filter((request) => OPEN_STATUSES.has(request.status));

  return (
    <FileRoomSectionCard title={fileRoom.customerRequests.title}>
      {loading ? <p className="fr-customer-request__meta">{fileRoom.customerRequests.loading}</p> : null}
      {error ? (
        <p className="fr-customer-request__error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && openRequests.length === 0 ? (
        <p className="fr-customer-request__meta">{fileRoom.customerRequests.empty}</p>
      ) : null}
      {!loading && !error && openRequests.length > 0 ? (
        <ul className="fr-customer-request-list">
          {openRequests.map((request) => (
            <RequestRow
              key={request.id}
              campaignId={campaignId}
              request={request}
              onUpdated={() => void refresh()}
            />
          ))}
        </ul>
      ) : null}
    </FileRoomSectionCard>
  );
}
