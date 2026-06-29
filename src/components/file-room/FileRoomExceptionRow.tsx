"use client";

import type { ReactNode } from "react";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import type { FileRoomExceptionRow } from "@/lib/campaign-tasks/exceptions-view";

type PanelMode = "assign" | "resolve" | null;

type FileRoomExceptionRowProps = {
  row: FileRoomExceptionRow;
  busy: boolean;
  activePanel: PanelMode;
  isActiveRow: boolean;
  onOpenAssign: () => void;
  onOpenResolve: () => void;
  onClosePanel: () => void;
  assignPanel: ReactNode;
  resolvePanel: ReactNode;
};

export default function FileRoomExceptionRowComponent({
  row,
  busy,
  activePanel,
  isActiveRow,
  onOpenAssign,
  onOpenResolve,
  onClosePanel,
  assignPanel,
  resolvePanel,
}: FileRoomExceptionRowProps) {
  const isClosed = row.status === "resolved" || row.status === "cancelled";
  const showAssign = !isClosed && row.permissions.canAssign && activePanel !== "resolve";
  const showResolve = !isClosed && row.permissions.canResolve && activePanel !== "assign";

  return (
    <li className={`fr-exception-row fr-exception-row--${row.status}`}>
      <div className="fr-exception-row__head">
        <span className="fr-exception-row__kind">{row.kindLabel}</span>
        <span className="fr-exception-row__status">{row.statusLabel}</span>
      </div>

      <p className="fr-exception-row__title">{row.title}</p>

      <div className="fr-exception-row__badges">
        {row.ownerReviewRequired ? (
          <span className="fr-exception-badge fr-exception-badge--owner">
            {campaignExceptionsConfig.ownerReviewRequiredLabel}
          </span>
        ) : null}
        {row.isAutoCreatedFromQa ? (
          <span className="fr-exception-badge fr-exception-badge--qa">
            {campaignExceptionsConfig.autoCreatedFromQaLabel}
          </span>
        ) : null}
      </div>

      {row.reasonPreview ? (
        <p className="fr-exception-row__meta">{row.reasonPreview}</p>
      ) : null}

      {row.taskTitle ? (
        <p className="fr-exception-row__meta">
          {campaignExceptionsConfig.linkedTaskLabel}: {row.taskTitle}
        </p>
      ) : null}

      <p className="fr-exception-row__meta">
        {campaignExceptionsConfig.raisedByLabel}: {row.raisedByDisplayName}
        {" · "}
        {campaignExceptionsConfig.assigneeLabel}:{" "}
        {row.assigneeDisplayName ?? campaignExceptionsConfig.unassignedLabel}
      </p>

      <p className="fr-exception-row__next-action">
        <strong>Next:</strong> {row.nextRequiredAction}
      </p>

      {(showAssign || showResolve) && !isActiveRow ? (
        <div className="fr-exception-row__actions">
          {showAssign ? (
            <button
              type="button"
              className="utility-btn"
              disabled={busy}
              onClick={onOpenAssign}
            >
              {campaignExceptionsConfig.assignLabel}
            </button>
          ) : null}
          {showResolve ? (
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={busy}
              onClick={onOpenResolve}
            >
              {campaignExceptionsConfig.resolveLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {isActiveRow && activePanel === "assign" ? (
        <div className="fr-exception-row__panel">
          {assignPanel}
          <button type="button" className="utility-btn" disabled={busy} onClick={onClosePanel}>
            Close
          </button>
        </div>
      ) : null}

      {isActiveRow && activePanel === "resolve" ? (
        <div className="fr-exception-row__panel">
          {resolvePanel}
          <button type="button" className="utility-btn" disabled={busy} onClick={onClosePanel}>
            Close
          </button>
        </div>
      ) : null}
    </li>
  );
}
