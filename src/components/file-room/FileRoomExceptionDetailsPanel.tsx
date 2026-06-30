"use client";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import type { FileRoomExceptionRow } from "@/lib/campaign-tasks/exceptions-view";

type FileRoomExceptionDetailsPanelProps = {
  row: FileRoomExceptionRow;
  expanded: boolean;
  onToggle: () => void;
};

export default function FileRoomExceptionDetailsPanel({
  row,
  expanded,
  onToggle,
}: FileRoomExceptionDetailsPanelProps) {
  const { promotion } = row;

  if (promotion.showPromotedSummary && promotion.promotedSummary) {
    const summary = promotion.promotedSummary;
    return (
      <div className="fr-exception-promotion fr-exception-promotion--readonly">
        <p className="fr-exception-promotion__title">
          {campaignExceptionsConfig.promotionPromotedSummaryTitle}
        </p>
        <p className="fr-exception-row__meta">
          {summary.clientFacingLabel} — {summary.categoryLabel}
        </p>
        <p className="fr-exception-row__meta">{summary.clientFacingPrompt}</p>
        <p className="fr-exception-row__meta">{summary.whyNeeded}</p>
        <p className="fr-exception-row__meta">
          Approved by {summary.approvedByDisplayName} · {summary.materialItemCount} slot(s)
        </p>
      </div>
    );
  }

  if (!promotion.showReadOnlyDetails && !promotion.promotionDeclined) {
    return null;
  }

  return (
    <div className="fr-exception-promotion fr-exception-promotion--readonly">
      <button type="button" className="utility-btn" onClick={onToggle}>
        {campaignExceptionsConfig.promotionViewDetailsLabel}
        {expanded ? " ↑" : " ↓"}
      </button>

      {expanded ? (
        <div className="fr-exception-promotion__details">
          <p className="fr-exception-promotion__zone-label">
            {campaignExceptionsConfig.promotionInternalZoneLabel}
          </p>
          <p className="fr-exception-promotion__internal">
            {promotion.internalContext ?? campaignExceptionsConfig.promotionNoInternalContext}
          </p>
          {row.taskTitle ? (
            <p className="fr-exception-row__meta">
              {campaignExceptionsConfig.linkedTaskLabel}: {row.taskTitle}
            </p>
          ) : null}
          <p className="fr-exception-row__meta">
            Status: {row.statusLabel}
          </p>
          {promotion.holdStateLabel ? (
            <p className="fr-exception-row__meta">{promotion.holdStateLabel}</p>
          ) : null}
          {promotion.promotionDeclined ? (
            <span className="fr-exception-badge fr-exception-badge--declined">
              {campaignExceptionsConfig.promotionDeclinedBadge}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
