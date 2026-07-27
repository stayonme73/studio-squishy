"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { PROJECT_COMMUNICATION_CUSTOMER_V1 as copy } from "@/config/project-communication-customer-v1";
import type { CampaignRecord } from "@/config/studio-board";
import { PROJECT_COMMUNICATION_BODY_MAX_LENGTH } from "@/lib/project-communication/types";
import { customerCommunicationSenderLabel } from "@/lib/project-communication/customer-ui";

type CustomerMessageView = {
  id: string;
  senderRole: "customer" | "studio_staff";
  body: string;
  createdAt: string;
  replyToMessageId: string | null;
  studioHasReplied: boolean | null;
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

type StudioBoardProjectCommunicationSectionProps = {
  campaign: CampaignRecord | null;
  hasCampaign: boolean;
  campaignLookupPending: boolean;
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

export default function StudioBoardProjectCommunicationSection({
  campaign,
  hasCampaign,
  campaignLookupPending,
}: StudioBoardProjectCommunicationSectionProps) {
  const fieldId = useId();
  const statusId = useId();
  const campaignId = campaign?.campaignId ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [messages, setMessages] = useState<CustomerMessageView[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const load = useCallback(async () => {
    if (!campaignId) {
      setMessages([]);
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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadFailedFallback);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (!hasCampaign || campaignLookupPending || !campaignId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    void load();
  }, [hasCampaign, campaignLookupPending, campaignId, load]);

  const trimmedLength = body.trim().length;
  const overLimit = body.length > PROJECT_COMMUNICATION_BODY_MAX_LENGTH;
  const canSubmit =
    Boolean(campaignId) && !busy && trimmedLength > 0 && !overLimit && !campaignLookupPending;

  const submit = async () => {
    if (!campaignId || !canSubmit) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
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
      setBody("");
      setIdempotencyKey(newIdempotencyKey());
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : copy.sendFailedFallback);
    } finally {
      setBusy(false);
    }
  };

  if (campaignLookupPending) {
    return (
      <article
        className="sb-card sb-card--project-communication bf-material bf-material-paper"
        aria-labelledby="sb-project-communication-title"
      >
        <p id="sb-project-communication-title" className="sb-card__tab">
          {copy.sectionTitle}
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

  return (
    <article
      className="sb-card sb-card--project-communication bf-material bf-material-paper"
      aria-labelledby="sb-project-communication-title"
    >
      <p id="sb-project-communication-title" className="sb-card__tab">
        {copy.sectionTitle}
      </p>
      <p className="sb-project-communication__lead">{copy.sectionLead}</p>

      <div className="sb-project-communication__body">
        <div
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
          <label className="sb-project-communication__label" htmlFor={fieldId}>
            {copy.composerLabel}
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
            placeholder={copy.composerPlaceholder}
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
              {busy ? copy.submitBusyLabel : copy.submitLabel}
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
        {success ? (
          <p className="sb-project-communication__success" role="status">
            {success}
          </p>
        ) : null}
      </div>
    </article>
  );
}
