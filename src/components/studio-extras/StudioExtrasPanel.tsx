"use client";

import { useState } from "react";

import { studioExtrasCustomerCopy } from "@/config/studio-extras-v1";
import type {
  StudioExtraCustomerView,
  StudioExtraFileView,
  StudioExtrasCustomerView,
} from "@/lib/studio-extras/customer-view";
import { useStudioExtras } from "@/lib/use-studio-extras";

import "./studio-extras-panel.css";

export type StudioExtrasPlacement = "board" | "review" | "delivery";

type Props = {
  campaignId: string | null | undefined;
  placement: StudioExtrasPlacement;
  /** Review Room: change notes that also travel with a package revision. */
  drafts?: Record<string, string>;
  onDraftsChange?: (drafts: Record<string, string>) => void;
  /** Bump to re-read after a package action. */
  refreshKey?: number;
  /** Rendered inside an existing card; the caller supplies the card chrome. */
  bare?: boolean;
};

function ExtraFile({ file }: { file: StudioExtraFileView }) {
  if (file.text != null) {
    return (
      <div className="sx-file sx-file--text">
        <p className="sx-file__label">{file.label}</p>
        <p className="sx-file__text">{file.text}</p>
      </div>
    );
  }
  if (file.mimeType.startsWith("image/")) {
    return (
      <figure className="sx-file sx-file--image">
        <a href={file.href} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.href} alt={file.label} loading="lazy" />
        </a>
        <figcaption className="sx-file__label">{file.label}</figcaption>
      </figure>
    );
  }
  return (
    <p className="sx-file sx-file--link">
      <a href={file.href} target="_blank" rel="noopener noreferrer">
        {file.mimeType === "application/pdf"
          ? studioExtrasCustomerCopy.openPdf(file.label)
          : studioExtrasCustomerCopy.openFile(file.label)}
      </a>
    </p>
  );
}

function ExtraCard({
  extra,
  placement,
  draft,
  onDraft,
  busy,
  onApprove,
  onSendChange,
}: {
  extra: StudioExtraCustomerView;
  placement: StudioExtrasPlacement;
  draft: string;
  onDraft: (value: string) => void;
  busy: boolean;
  onApprove: () => void;
  onSendChange: () => void;
}) {
  const [changeOpen, setChangeOpen] = useState(draft.trim().length > 0);
  const reviewing = placement !== "delivery" && extra.canApprove;
  const noteId = `sx-note-${extra.id}`;
  return (
    <li className="sx-extra" data-studio-extra={extra.id} data-studio-extra-state={extra.state}>
      <div className="sx-extra__head">
        <p className="sx-extra__name">{extra.name}</p>
        <p className="sx-extra__status" role="status">
          {extra.statusLine}
        </p>
      </div>
      {placement !== "delivery" && extra.state !== "delivered" ? (
        <ul className="sx-extra__includes">
          {extra.includes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {extra.waitingOn.length > 0 ? (
        <div className="sx-extra__waiting">
          <p>{studioExtrasCustomerCopy.waitingLead}</p>
          <ul>
            {extra.waitingOn.map((item) => (
              <li key={item.label}>
                <strong>{item.label}.</strong> {item.prompt}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {extra.files.length > 0 ? (
        <div className="sx-extra__files">
          {extra.files.map((file) => (
            <ExtraFile key={file.href} file={file} />
          ))}
        </div>
      ) : null}
      {reviewing ? (
        <div className="sx-extra__actions">
          <button
            type="button"
            className="utility-btn utility-btn--primary sx-extra__approve"
            disabled={busy}
            onClick={onApprove}
          >
            {studioExtrasCustomerCopy.approve}
          </button>
          <button
            type="button"
            className="utility-btn sx-extra__change"
            aria-expanded={changeOpen}
            aria-controls={noteId}
            disabled={busy}
            onClick={() => setChangeOpen((open) => !open)}
          >
            {studioExtrasCustomerCopy.requestChange}
          </button>
        </div>
      ) : null}
      {reviewing && changeOpen ? (
        <div className="sx-extra__change-form" id={noteId}>
          <label className="sx-extra__change-label" htmlFor={`${noteId}-input`}>
            {studioExtrasCustomerCopy.changeLabel}
          </label>
          <textarea
            id={`${noteId}-input`}
            className="sx-extra__change-input"
            rows={3}
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
          />
          <button
            type="button"
            className="utility-btn utility-btn--primary sx-extra__send"
            disabled={busy || draft.trim().length === 0}
            onClick={onSendChange}
          >
            {studioExtrasCustomerCopy.sendChange}
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function StudioExtrasPanelBody({
  view,
  placement,
  drafts,
  setDraft,
  busy,
  error,
  notice,
  onApprove,
  onSendChange,
}: {
  view: StudioExtrasCustomerView;
  placement: StudioExtrasPlacement;
  drafts: Record<string, string>;
  setDraft: (id: string, value: string) => void;
  busy: boolean;
  error: string | null;
  notice: string | null;
  onApprove: (id: string) => void;
  onSendChange: (id: string) => void;
}) {
  const extras =
    placement === "delivery"
      ? view.extras.filter((extra) => extra.state === "delivered" || extra.state === "exhausted")
      : view.extras;
  if (extras.length === 0) return null;
  return (
    <div className="sx-panel__body">
      {placement !== "delivery" ? (
        <p className="sx-panel__lead">
          {studioExtrasCustomerCopy.includedLead}{" "}
          {placement === "review"
            ? studioExtrasCustomerCopy.revisionRuleReview
            : studioExtrasCustomerCopy.revisionRuleBoard}
        </p>
      ) : null}
      <ul className="sx-panel__list">
        {extras.map((extra) => (
          <ExtraCard
            key={extra.id}
            extra={extra}
            placement={placement}
            draft={drafts[extra.id] ?? ""}
            onDraft={(value) => setDraft(extra.id, value)}
            busy={busy}
            onApprove={() => onApprove(extra.id)}
            onSendChange={() => onSendChange(extra.id)}
          />
        ))}
      </ul>
      {view.courtesy ? (
        <p className="sx-panel__courtesy" role="status">
          {view.courtesy.message}
        </p>
      ) : null}
      {error ? (
        <p className="sx-panel__error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="sx-panel__notice" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

export default function StudioExtrasPanel({
  campaignId,
  placement,
  drafts: controlledDrafts,
  onDraftsChange,
  refreshKey = 0,
  bare = false,
}: Props) {
  const { state, act, refresh } = useStudioExtras(campaignId);
  const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [seenKey, setSeenKey] = useState(refreshKey);
  if (seenKey !== refreshKey) {
    setSeenKey(refreshKey);
    void refresh();
  }

  const drafts = controlledDrafts ?? localDrafts;
  const setDrafts = onDraftsChange ?? setLocalDrafts;

  if (state.status !== "ready" || !state.view) return null;
  const view = state.view;
  const visible =
    placement === "delivery"
      ? view.extras.some((extra) => extra.state === "delivered" || extra.state === "exhausted")
      : view.extras.length > 0;
  if (!visible) return null;

  async function run(body: Parameters<typeof act>[0], success: string, clearId?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await act(body);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (clearId) {
      const next = { ...drafts };
      delete next[clearId];
      setDrafts(next);
    }
    setNotice(success);
  }

  const body = (
    <StudioExtrasPanelBody
      view={view}
      placement={placement}
      drafts={drafts}
      setDraft={(id, value) => setDrafts({ ...drafts, [id]: value })}
      busy={busy}
      error={error}
      notice={notice}
      onApprove={(id) =>
        void run({ action: "approve", extraIds: [id] }, studioExtrasCustomerCopy.approvedNotice)
      }
      onSendChange={(id) =>
        void run(
          { action: "request_changes", changes: [{ id, note: drafts[id] ?? "" }] },
          studioExtrasCustomerCopy.changeSentNotice,
          id,
        )
      }
    />
  );

  if (bare) {
    return (
      <section className="sx-panel sx-panel--bare" aria-label={studioExtrasCustomerCopy.title}>
        <h3 className="sx-panel__title">{studioExtrasCustomerCopy.title}</h3>
        {body}
      </section>
    );
  }
  return (
    <article
      className="sb-card sb-card--studio-extras bf-material bf-material-paper sx-panel"
      aria-label={studioExtrasCustomerCopy.title}
      data-studio-extras-placement={placement}
    >
      <p className="sb-card__tab">{studioExtrasCustomerCopy.tab}</p>
      {body}
    </article>
  );
}
