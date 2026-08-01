"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { PROJECT_COMMUNICATION_CUSTOMER_V1 as copy } from "@/config/project-communication-customer-v1";
import { PROJECT_COMMUNICATION_PROBLEM_REPORT_V1 as problemCopy } from "@/config/project-communication-problem-report-v1";
import type { CampaignRecord } from "@/config/studio-board";
import { PROJECT_COMMUNICATION_BODY_MAX_LENGTH } from "@/lib/project-communication/types";
import { customerCommunicationSenderLabel } from "@/lib/project-communication/customer-ui";
import type { ProblemReportCustomerView } from "@/lib/campaign-tasks/problem-report-status-view";

type CustomerMessageView = {
  id: string;
  senderRole: "customer" | "studio_staff";
  body: string;
  createdAt: string;
  replyToMessageId: string | null;
  studioHasReplied: boolean | null;
};

/** ISSUE-ENTRY-1 — typed customer intent. "question" keeps the ordinary message path. */
type ComposerIntent = "question" | "problem";

type NotificationState = {
  hasNewStudioReply: boolean;
  newestStudioReplyId: string | null;
  newestStudioReplyCreatedAt: string | null;
  lastAcknowledgedStudioReplyId: string | null;
  lastAcknowledgedAt: string | null;
};

type ListResponse = {
  messages?: CustomerMessageView[];
  error?: string;
};

type SendResponse = {
  confirmation?: string;
  messages?: CustomerMessageView[];
  error?: string;
};

type NotificationResponse = {
  notification?: NotificationState;
  error?: string;
};

type ProblemReportResponse = {
  problemReport?: ProblemReportCustomerView | null;
  confirmation?: string;
  replayed?: boolean;
  error?: string;
};

type StudioBoardProjectCommunicationSectionProps = {
  campaign: CampaignRecord | null;
  hasCampaign: boolean;
  campaignLookupPending: boolean;
  /** ISSUE-ENTRY-1 — optional job association when the surrounding surface is job-scoped. */
  jobId?: string | null;
  /** C8a — Review Room chrome; defaults preserve Board copy and card layout. */
  presentation?: {
    sectionTitle: string;
    sectionLead: string;
    titleId?: string;
    rootClassName?: string;
  };
};

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `customer-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const EMPTY_NOTIFICATION: NotificationState = {
  hasNewStudioReply: false,
  newestStudioReplyId: null,
  newestStudioReplyCreatedAt: null,
  lastAcknowledgedStudioReplyId: null,
  lastAcknowledgedAt: null,
};

export default function StudioBoardProjectCommunicationSection({
  campaign,
  hasCampaign,
  campaignLookupPending,
  jobId,
  presentation,
}: StudioBoardProjectCommunicationSectionProps) {
  const fieldId = useId();
  const statusId = useId();
  const noticeId = useId();
  const intentLegendId = useId();
  const problemStatusId = useId();
  const generatedTitleId = useId();
  const titleId = presentation?.titleId ?? generatedTitleId;
  const sectionTitle = presentation?.sectionTitle ?? copy.sectionTitle;
  const sectionLead = presentation?.sectionLead ?? copy.sectionLead;
  const rootClassName =
    presentation?.rootClassName ??
    "sb-card sb-card--project-communication bf-material bf-material-paper";
  const threadRef = useRef<HTMLDivElement | null>(null);
  const campaignId = campaign?.campaignId ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [messages, setMessages] = useState<CustomerMessageView[]>([]);
  const [notification, setNotification] = useState<NotificationState>(EMPTY_NOTIFICATION);
  const [notificationLoadFailed, setNotificationLoadFailed] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  // ISSUE-ENTRY-1 — typed intent selector. Defaults to "question" on every load and after
  // a problem report is submitted, so this never becomes a permanent composer mode.
  const [intent, setIntent] = useState<ComposerIntent>("question");
  const [problemReport, setProblemReport] = useState<ProblemReportCustomerView | null>(null);
  const [problemStatusLoadFailed, setProblemStatusLoadFailed] = useState(false);

  const loadNotification = useCallback(async (id: string) => {
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(id)}/project-communication/acknowledgment`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      const json = (await res.json()) as NotificationResponse;
      if (!res.ok) {
        setNotificationLoadFailed(true);
        setNotification(EMPTY_NOTIFICATION);
        return;
      }
      setNotificationLoadFailed(false);
      setNotification(json.notification ?? EMPTY_NOTIFICATION);
    } catch {
      setNotificationLoadFailed(true);
      setNotification(EMPTY_NOTIFICATION);
    }
  }, []);

  const loadProblemReportStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(id)}/project-communication/customer/problem-report`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      const json = (await res.json()) as ProblemReportResponse;
      if (!res.ok) {
        setProblemStatusLoadFailed(true);
        setProblemReport(null);
        return;
      }
      setProblemStatusLoadFailed(false);
      setProblemReport(json.problemReport ?? null);
    } catch {
      setProblemStatusLoadFailed(true);
      setProblemReport(null);
    }
  }, []);

  const load = useCallback(async () => {
    if (!campaignId) {
      setMessages([]);
      setNotification(EMPTY_NOTIFICATION);
      setProblemReport(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/project-communication/customer`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      const json = (await res.json()) as ListResponse;
      if (!res.ok) {
        throw new Error(json.error ?? copy.loadFailedFallback);
      }
      setMessages(json.messages ?? []);
      await loadNotification(campaignId);
      await loadProblemReportStatus(campaignId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadFailedFallback);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId, loadNotification, loadProblemReportStatus]);

  useEffect(() => {
    if (!hasCampaign || campaignLookupPending || !campaignId) {
      setMessages([]);
      setNotification(EMPTY_NOTIFICATION);
      setProblemReport(null);
      setLoading(false);
      return;
    }
    void load();
  }, [hasCampaign, campaignLookupPending, campaignId, load]);

  const trimmedLength = body.trim().length;
  const overLimit = body.length > PROJECT_COMMUNICATION_BODY_MAX_LENGTH;
  const canSubmit =
    Boolean(campaignId) && !busy && trimmedLength > 0 && !overLimit && !campaignLookupPending;

  const submitQuestion = async () => {
    if (!campaignId) return;
    const res = await fetch(
      `/api/campaigns/${encodeURIComponent(campaignId)}/project-communication/customer`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "customer_message",
          body,
          idempotencyKey,
        }),
      },
    );
    const json = (await res.json()) as SendResponse;
    if (!res.ok) {
      throw new Error(json.error ?? copy.sendFailedFallback);
    }
    setSuccess(json.confirmation ?? copy.successCopy);
    setMessages(json.messages ?? []);
    await loadNotification(campaignId);
  };

  const submitProblem = async () => {
    if (!campaignId) return;
    const res = await fetch(
      `/api/campaigns/${encodeURIComponent(campaignId)}/project-communication/customer/problem-report`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "customer_problem_report",
          message: body,
          idempotencyKey,
          ...(jobId ? { jobId } : {}),
        }),
      },
    );
    const json = (await res.json()) as ProblemReportResponse;
    if (!res.ok) {
      throw new Error(json.error ?? problemCopy.problemSendFailedFallback);
    }
    setSuccess(json.confirmation ?? problemCopy.problemConfirmation);
    setProblemReport(json.problemReport ?? null);
    setProblemStatusLoadFailed(false);
    // Never a permanent composer mode — hand the composer back to ordinary messages.
    setIntent("question");
  };

  const submit = async () => {
    if (!campaignId || !canSubmit) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (intent === "problem") {
        await submitProblem();
      } else {
        await submitQuestion();
      }
      setBody("");
      setIdempotencyKey(newIdempotencyKey());
    } catch (sendError) {
      const fallback =
        intent === "problem" ? problemCopy.problemSendFailedFallback : copy.sendFailedFallback;
      setError(sendError instanceof Error ? sendError.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const viewProjectMessages = async () => {
    if (!campaignId || !notification.newestStudioReplyId || ackBusy) return;
    setAckBusy(true);
    setAckError(null);
    threadRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/project-communication/acknowledgment`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "acknowledge_studio_reply",
            studioReplyMessageId: notification.newestStudioReplyId,
            channel: "customer_board_view_messages",
          }),
        },
      );
      const json = (await res.json()) as NotificationResponse & { confirmation?: string };
      if (!res.ok) {
        throw new Error(json.error ?? copy.acknowledgeFailedFallback);
      }
      setNotification(json.notification ?? EMPTY_NOTIFICATION);
    } catch (ackErr) {
      setAckError(ackErr instanceof Error ? ackErr.message : copy.acknowledgeFailedFallback);
    } finally {
      setAckBusy(false);
    }
  };

  if (campaignLookupPending) {
    return (
      <article className={rootClassName} aria-labelledby={titleId}>
        <p id={titleId} className="sb-card__tab">
          {sectionTitle}
        </p>
        <p className="sb-project-communication__meta" aria-busy="true">
          Loading project messages…
        </p>
      </article>
    );
  }

  if (!hasCampaign || !campaignId) {
    return null;
  }

  const showNewReply =
    !notificationLoadFailed && notification.hasNewStudioReply && Boolean(notification.newestStudioReplyId);

  return (
    <article className={rootClassName} aria-labelledby={titleId}>
      <div className="sb-project-communication__header">
        <p id={titleId} className="sb-card__tab">
          {showNewReply ? copy.neutralMessagesLabel : sectionTitle}
        </p>
        {showNewReply ? (
          <div className="sb-project-communication__notice" id={noticeId}>
            <p className="sb-project-communication__notice-text" role="status">
              {copy.newReplyIndicator}
            </p>
            <button
              type="button"
              className="utility-btn utility-btn--secondary sb-project-communication__notice-action"
              onClick={() => void viewProjectMessages()}
              disabled={ackBusy}
            >
              {ackBusy ? "Opening…" : copy.viewMessagesAction}
            </button>
          </div>
        ) : null}
      </div>
      <p className="sb-project-communication__lead">{sectionLead}</p>

      <div className="sb-project-communication__body">
        <div
          ref={threadRef}
          className="sb-project-communication__thread"
          aria-live="polite"
          aria-busy={loading || undefined}
        >
          {loading ? (
            <p className="sb-project-communication__meta">Loading project messages…</p>
          ) : messages.length === 0 ? (
            <p className="sb-project-communication__meta">{copy.emptyState}</p>
          ) : (
            <ul className="sb-project-communication__list">
              {messages.map((message) => (
                <li key={message.id} className="sb-project-communication__item">
                  <div className="sb-project-communication__item-meta">
                    <span className="sb-project-communication__sender">
                      {customerCommunicationSenderLabel(message.senderRole)}
                    </span>
                    <time
                      className="sb-project-communication__when"
                      dateTime={message.createdAt}
                    >
                      {formatWhen(message.createdAt)}
                    </time>
                  </div>
                  <p className="sb-project-communication__text">{message.body}</p>
                  {message.senderRole === "customer" && message.studioHasReplied === false ? (
                    <p className="sb-project-communication__awaiting">{copy.awaitingReplyLabel}</p>
                  ) : null}
                  {message.senderRole === "customer" && message.studioHasReplied === true ? (
                    <p className="sb-project-communication__replied">{copy.repliedLabel}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          className="sb-project-communication__composer"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <fieldset
            className="sb-project-communication__intent"
            aria-describedby={problemReport ? problemStatusId : undefined}
          >
            <legend id={intentLegendId} className="sb-project-communication__intent-legend">
              {problemCopy.intentLegend}
            </legend>
            <div className="sb-project-communication__intent-options">
              {(
                [
                  { value: "question" as const, label: problemCopy.intentQuestionLabel },
                  { value: "problem" as const, label: problemCopy.intentProblemLabel },
                ]
              ).map((option) => (
                <label
                  key={option.value}
                  className="sb-project-communication__intent-option"
                  data-selected={intent === option.value ? "true" : undefined}
                >
                  <input
                    type="radio"
                    name={`${fieldId}-intent`}
                    value={option.value}
                    checked={intent === option.value}
                    disabled={busy}
                    onChange={() => {
                      if (intent === option.value) return;
                      setIntent(option.value);
                      setBody("");
                      setError(null);
                      setSuccess(null);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {problemReport && !problemStatusLoadFailed ? (
            <p
              id={problemStatusId}
              className="sb-project-communication__problem-status"
              role="status"
            >
              <span className="sb-project-communication__problem-status-heading">
                {problemCopy.problemStatusHeading}:
              </span>{" "}
              {problemReport.statusLabel}
            </p>
          ) : null}

          <label className="sb-project-communication__label" htmlFor={fieldId}>
            {intent === "problem" ? problemCopy.problemComposerLabel : copy.composerLabel}
          </label>
          <textarea
            id={fieldId}
            className="sb-project-communication__textarea"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              if (success) setSuccess(null);
            }}
            maxLength={PROJECT_COMMUNICATION_BODY_MAX_LENGTH}
            rows={4}
            placeholder={
              intent === "problem" ? problemCopy.problemComposerPlaceholder : copy.composerPlaceholder
            }
            disabled={busy}
            aria-describedby={statusId}
          />
          <div className="sb-project-communication__composer-footer">
            <p className="sb-project-communication__count" aria-hidden="true">
              {body.length}/{PROJECT_COMMUNICATION_BODY_MAX_LENGTH}
            </p>
            <button
              type="submit"
              className="utility-btn utility-btn--primary sb-project-communication__submit"
              disabled={!canSubmit}
            >
              {intent === "problem"
                ? busy
                  ? problemCopy.problemSubmitBusyLabel
                  : problemCopy.problemSubmitLabel
                : busy
                  ? copy.submitBusyLabel
                  : copy.submitLabel}
            </button>
          </div>
        </form>
      </div>

      <div id={statusId} className="sb-project-communication__status" aria-live="polite">
        {error ? (
          <p className="sb-project-communication__error" role="alert">
            {error}
          </p>
        ) : null}
        {ackError ? (
          <p className="sb-project-communication__error" role="alert">
            {ackError}
          </p>
        ) : null}
        {success ? (
          <p className="sb-project-communication__success" role="status">
            {success}
          </p>
        ) : null}
      </div>
    </article>
  );
}
