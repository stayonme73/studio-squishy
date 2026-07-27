"use client";

import { useCallback, useEffect, useId, useState } from "react";

import { PROJECT_COMMUNICATION_STAFF_V1 as copy } from "@/config/project-communication-staff-v1";
import {
  PROJECT_COMMUNICATION_BODY_MAX_LENGTH,
  type ProjectCommunicationMessage,
} from "@/lib/project-communication/types";

import FileRoomSectionCard from "./FileRoomSectionCard";

type StaffMessageView = ProjectCommunicationMessage & {
  studioHasReplied: boolean;
};

type ListResponse = {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  clientUserId: string | null;
  messages: StaffMessageView[];
  syncedAt: string;
  error?: string;
};

type ReplyResponse = {
  confirmation?: string;
  messages?: StaffMessageView[];
  error?: string;
};

type FileRoomProjectCommunicationSectionProps = {
  campaignId: string;
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
  return `staff-reply-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function FileRoomProjectCommunicationSection({
  campaignId,
}: FileRoomProjectCommunicationSectionProps) {
  const replyFieldId = useId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [clientUserId, setClientUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StaffMessageView[]>([]);
  const [selectedCustomerMessageId, setSelectedCustomerMessageId] = useState<string | null>(
    null,
  );
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/project-communication`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const json = (await res.json()) as ListResponse;
      if (!res.ok) {
        throw new Error(json.error ?? copy.loadFailedFallback);
      }
      setCampaignName(json.campaignName);
      setClientUserId(json.clientUserId);
      setMessages(json.messages ?? []);
      setSelectedCustomerMessageId((current) => {
        if (current && json.messages?.some((m) => m.id === current && m.senderRole === "customer")) {
          return current;
        }
        const firstOpen = json.messages?.find(
          (m) => m.senderRole === "customer" && !m.studioHasReplied,
        );
        return firstOpen?.id ?? json.messages?.find((m) => m.senderRole === "customer")?.id ?? null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadFailedFallback);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = messages.find(
    (message) => message.id === selectedCustomerMessageId && message.senderRole === "customer",
  );

  const submitReply = async () => {
    if (!selected) {
      setError(copy.selectMessageHint);
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/project-communication`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          action: "studio_reply",
          body: replyBody,
          replyToMessageId: selected.id,
          idempotencyKey,
        }),
      });
      const json = (await res.json()) as ReplyResponse;
      if (!res.ok) {
        throw new Error(json.error ?? copy.replyFailedFallback);
      }
      setSuccess(json.confirmation ?? copy.replySuccess);
      if (json.messages) setMessages(json.messages);
      setReplyBody("");
      setIdempotencyKey(newIdempotencyKey());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : copy.replyFailedFallback);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FileRoomSectionCard title={copy.sectionTitle}>
      <p className="fr-tasks-lead">{copy.sectionLead}</p>

      <ul className="fr-kv-list fr-kv-list--split" style={{ marginBottom: "0.85rem" }}>
        <li className="fr-kv-list__row">
          <span className="fr-kv-list__label">{copy.campaignContextLabel}</span>
          <p className="fr-kv-list__value">{campaignName || campaignId}</p>
        </li>
        <li className="fr-kv-list__row">
          <span className="fr-kv-list__label">{copy.accountIdLabel}</span>
          <p className="fr-kv-list__value">{clientUserId ?? "Not bound yet"}</p>
        </li>
      </ul>

      {loading ? <p className="fr-tasks-lead">Loading project communication…</p> : null}
      {error ? (
        <p className="fr-customer-request__error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="fr-project-comm__success" role="status">
          {success}
        </p>
      ) : null}

      {!loading && messages.length === 0 ? (
        <p className="fr-tasks-lead">{copy.emptyState}</p>
      ) : null}

      {messages.length > 0 ? (
        <ol className="fr-project-comm-list">
          {messages.map((message) => {
            const isCustomer = message.senderRole === "customer";
            const isSelected = selectedCustomerMessageId === message.id;
            return (
              <li
                key={message.id}
                className={
                  isSelected ? "fr-project-comm-item fr-project-comm-item--selected" : "fr-project-comm-item"
                }
              >
                <div className="fr-customer-request__head">
                  <span className="fr-customer-request__target">
                    {isCustomer ? copy.customerLabel : copy.studioLabel}
                    {message.senderDisplayName ? ` · ${message.senderDisplayName}` : ""}
                  </span>
                  <span className="fr-customer-request__status">{formatWhen(message.createdAt)}</span>
                </div>
                <p className="fr-customer-request__meta">
                  {isCustomer
                    ? message.studioHasReplied
                      ? copy.repliedLabel
                      : copy.awaitingReplyLabel
                    : `In reply to ${message.replyToMessageId ?? "customer message"}`}
                </p>
                <p className="fr-customer-request__value">{message.body}</p>
                {isCustomer ? (
                  <div className="fr-customer-request__actions">
                    <button
                      type="button"
                      className="utility-btn utility-btn--secondary"
                      onClick={() => {
                        setSelectedCustomerMessageId(message.id);
                        setSuccess(null);
                        setError(null);
                      }}
                    >
                      {copy.replyComposerLabel}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      {selected ? (
        <div className="fr-project-comm-composer">
          <label className="fr-customer-request__reject-label" htmlFor={replyFieldId}>
            {copy.replyComposerLabel}
            <textarea
              id={replyFieldId}
              className="fr-customer-request__reject-input fr-project-comm-textarea"
              value={replyBody}
              maxLength={PROJECT_COMMUNICATION_BODY_MAX_LENGTH}
              rows={4}
              placeholder={copy.replyPlaceholder}
              disabled={busy}
              onChange={(event) => setReplyBody(event.target.value)}
            />
          </label>
          <p className="fr-customer-request__meta">
            Replying to customer message from {formatWhen(selected.createdAt)}. Max{" "}
            {PROJECT_COMMUNICATION_BODY_MAX_LENGTH} characters.
          </p>
          <div className="fr-customer-request__actions">
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={busy || replyBody.trim().length === 0}
              onClick={() => void submitReply()}
            >
              {busy ? copy.replyBusyLabel : copy.replySubmitLabel}
            </button>
          </div>
        </div>
      ) : null}
    </FileRoomSectionCard>
  );
}
