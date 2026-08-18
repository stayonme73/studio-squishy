"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { REFUND_REQUEST_CUSTOMER_V1 as copy } from "@/config/refund-request-customer-v1";
import type { CampaignRecord } from "@/config/studio-board";
import type { RefundRequestCustomerView } from "@/lib/campaign-tasks/refund-request-status-view";
import {
  mapRefundRequestSubmitFailure,
  mapRefundRequestSubmitSuccess,
} from "@/lib/campaign-tasks/refund-request-customer-ui";
import { useProjectJobStatus } from "@/lib/use-project-job-status";

const REASON_MAX = 2000;
const OUTCOME_MAX = 500;
const DETAILS_MAX = 2000;

type StudioBoardRefundRequestSectionProps = {
  campaign: CampaignRecord | null;
  hasCampaign: boolean;
  campaignLookupPending: boolean;
};

export default function StudioBoardRefundRequestSection({
  campaign,
  hasCampaign,
  campaignLookupPending,
}: StudioBoardRefundRequestSectionProps) {
  const titleId = useId();
  const jobFieldId = useId();
  const reasonId = useId();
  const outcomeId = useId();
  const detailsId = useId();
  const statusId = useId();
  const persistentStatusId = useId();

  const campaignId = campaign?.campaignId ?? null;
  const paymentReceived = Boolean(campaign?.paymentReceivedAt);
  const { jobs, loading: jobsLoading, error: jobsError } = useProjectJobStatus(
    paymentReceived && campaignId ? campaignId : undefined,
  );

  // Include Cancelled jobs so customers can return to an approved-refund decision
  // (spine refunded_cancelled maps to customer label "Cancelled").
  const selectableJobs = jobs;

  const [jobId, setJobId] = useState("");
  const [reason, setReason] = useState("");
  const [requestedOutcome, setRequestedOutcome] = useState("");
  const [supportingDetails, setSupportingDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lockedAfterSubmit, setLockedAfterSubmit] = useState(false);
  const [refundStatus, setRefundStatus] = useState<RefundRequestCustomerView | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusLoadFailed, setStatusLoadFailed] = useState(false);

  const effectiveJobId =
    jobId || (selectableJobs.length === 1 ? selectableJobs[0]!.jobId : "");
  const selectedJob = selectableJobs.find((job) => job.jobId === effectiveJobId) ?? null;
  const productionStarted = Boolean(selectedJob?.hasProductionStarted);
  const hasPersistentStatus = Boolean(refundStatus);
  const formLocked = lockedAfterSubmit || hasPersistentStatus;

  const canSubmit =
    Boolean(campaignId && effectiveJobId && reason.trim() && requestedOutcome.trim()) &&
    !busy &&
    !formLocked;

  useEffect(() => {
    if (!campaignId || !effectiveJobId) {
      setRefundStatus(null);
      setStatusLoadFailed(false);
      setStatusLoading(false);
      return;
    }

    let cancelled = false;
    setStatusLoading(true);
    setStatusLoadFailed(false);

    void (async () => {
      try {
        const response = await fetch(
          `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(effectiveJobId)}/refund-request`,
          {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          refundRequest?: RefundRequestCustomerView | null;
        };
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setRefundStatus(null);
          setStatusLoadFailed(true);
          return;
        }
        setRefundStatus(payload.refundRequest ?? null);
        setStatusLoadFailed(false);
      } catch {
        if (!cancelled) {
          setRefundStatus(null);
          setStatusLoadFailed(true);
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, effectiveJobId]);

  if (campaignLookupPending) {
    return (
      <article
        className="sb-card sb-card--refund-request bf-material bf-material-paper"
        aria-labelledby={titleId}
      >
        <p id={titleId} className="sb-card__tab">
          {copy.sectionTitle}
        </p>
        <p className="sb-refund-request__lead">{copy.unavailable}</p>
      </article>
    );
  }

  if (!hasCampaign || !campaignId || !paymentReceived) {
    return null;
  }

  async function submit() {
    if (!campaignId || !effectiveJobId || !canSubmit) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(effectiveJobId)}/refund-request`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: reason.trim(),
            requestedOutcome: requestedOutcome.trim(),
            supportingDetails: supportingDetails.trim() || undefined,
            sourceChannel: "studio_board_help",
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        const outcome = mapRefundRequestSubmitFailure(response.status, payload.error);
        setError(outcome.message);
        if (
          outcome.kind === "pending_owner_review" ||
          outcome.kind === "already_submitted" ||
          outcome.kind === "already_decided"
        ) {
          setLockedAfterSubmit(true);
          setSuccess(null);
        }
        return;
      }
      const ok = mapRefundRequestSubmitSuccess();
      setSuccess(ok.message);
      setLockedAfterSubmit(true);
      setReason("");
      setRequestedOutcome("");
      setSupportingDetails("");
      // Refresh persistent status so return visits stay truthful after submit.
      const statusResponse = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(effectiveJobId)}/refund-request`,
        {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      const statusPayload = (await statusResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        refundRequest?: RefundRequestCustomerView | null;
      };
      if (statusResponse.ok && statusPayload.ok) {
        setRefundStatus(statusPayload.refundRequest ?? null);
        setStatusLoadFailed(false);
      }
    } catch {
      setError(copy.submitFailedFallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className="sb-card sb-card--refund-request bf-material bf-material-paper"
      aria-labelledby={titleId}
    >
      <p id={titleId} className="sb-card__tab">
        {copy.sectionTitle}
      </p>
      <p className="sb-refund-request__lead">{copy.sectionLead}</p>
      <p className="sb-refund-request__policy">{copy.policyNote}</p>
      <p className="sb-refund-request__help">
        <Link href={copy.helpCenterHref} className="sb-refund-request__help-link">
          {copy.helpCenterHint}
        </Link>
      </p>

      {jobsLoading ? (
        <p className="sb-refund-request__meta">{copy.jobLoading}</p>
      ) : jobsError ? (
        <p className="sb-refund-request__error" role="alert">
          {copy.jobLoadFailed}
        </p>
      ) : selectableJobs.length === 0 ? (
        <p className="sb-refund-request__meta">{copy.jobEmpty}</p>
      ) : (
        <form
          className="sb-refund-request__form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {selectableJobs.length > 1 ? (
            <>
              <label className="sb-refund-request__label" htmlFor={jobFieldId}>
                {copy.jobLabel}
              </label>
              <select
                id={jobFieldId}
                className="sb-refund-request__select"
                value={effectiveJobId}
                disabled={busy}
                onChange={(event) => {
                  setJobId(event.target.value);
                  setError(null);
                  setSuccess(null);
                  setLockedAfterSubmit(false);
                }}
              >
                <option value="">{copy.jobSelectPlaceholder}</option>
                {selectableJobs.map((job) => (
                  <option key={job.jobId} value={job.jobId}>
                    {job.serviceName} — {job.statusLabel}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="sb-refund-request__meta">
              {selectableJobs[0]!.serviceName} — {selectableJobs[0]!.statusLabel}
            </p>
          )}

          {effectiveJobId && statusLoading ? (
            <p className="sb-refund-request__meta">{copy.statusLoading}</p>
          ) : null}
          {effectiveJobId && statusLoadFailed ? (
            <p className="sb-refund-request__error" role="alert">
              {copy.statusLoadFailed}
            </p>
          ) : null}
          {refundStatus ? (
            <div
              id={persistentStatusId}
              className="sb-refund-request__persistent-status"
              role="status"
              aria-live="polite"
            >
              <p className="sb-refund-request__status-heading">{copy.statusHeading}</p>
              <p className="sb-refund-request__status-body">{refundStatus.statusLabel}</p>
            </div>
          ) : null}

          {productionStarted && !hasPersistentStatus ? (
            <p className="sb-refund-request__warning" role="status">
              {copy.productionStartedNote}
            </p>
          ) : null}

          {!hasPersistentStatus ? (
            <>
              <label className="sb-refund-request__label" htmlFor={reasonId}>
                {copy.reasonLabel}
              </label>
              <textarea
                id={reasonId}
                className="sb-refund-request__textarea"
                value={reason}
                maxLength={REASON_MAX}
                rows={3}
                placeholder={copy.reasonPlaceholder}
                disabled={busy || formLocked}
                onChange={(event) => {
                  setReason(event.target.value);
                  if (success) setSuccess(null);
                }}
                aria-describedby={statusId}
              />

              <label className="sb-refund-request__label" htmlFor={outcomeId}>
                {copy.outcomeLabel}
              </label>
              <textarea
                id={outcomeId}
                className="sb-refund-request__textarea"
                value={requestedOutcome}
                maxLength={OUTCOME_MAX}
                rows={2}
                placeholder={copy.outcomePlaceholder}
                disabled={busy || formLocked}
                onChange={(event) => {
                  setRequestedOutcome(event.target.value);
                  if (success) setSuccess(null);
                }}
              />

              <label className="sb-refund-request__label" htmlFor={detailsId}>
                {copy.detailsLabel}
              </label>
              <textarea
                id={detailsId}
                className="sb-refund-request__textarea"
                value={supportingDetails}
                maxLength={DETAILS_MAX}
                rows={2}
                placeholder={copy.detailsPlaceholder}
                disabled={busy || formLocked}
                onChange={(event) => setSupportingDetails(event.target.value)}
              />

              <div className="sb-refund-request__footer">
                <button
                  type="submit"
                  className="utility-btn utility-btn--primary sb-refund-request__submit"
                  disabled={!canSubmit}
                >
                  {busy ? copy.submitBusyLabel : copy.submitLabel}
                </button>
              </div>
            </>
          ) : null}
        </form>
      )}

      <div id={statusId} className="sb-refund-request__status" aria-live="polite">
        {error ? (
          <p className="sb-refund-request__error" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="sb-refund-request__success" role="status">
            {success}
          </p>
        ) : null}
      </div>
    </article>
  );
}
