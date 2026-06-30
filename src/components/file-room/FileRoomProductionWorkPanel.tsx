"use client";

import { useState } from "react";

import { campaignProductionConfig } from "@/config/campaign-production";
import type { FileRoomProductionWorkPanelView } from "@/lib/campaign-production/production-view";

type FileRoomProductionWorkPanelProps = {
  campaignId: string;
  taskId: string;
  view: FileRoomProductionWorkPanelView;
  onVersionSaved: (versionId: string, body: string) => void;
};

export default function FileRoomProductionWorkPanel({
  campaignId,
  taskId,
  view,
  onVersionSaved,
}: FileRoomProductionWorkPanelProps) {
  const [body, setBody] = useState(view.currentBody);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!view.visible) {
    return null;
  }

  const saveVersion = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/production`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_version",
          taskId,
          body,
          reason: view.currentVersionId ? "internal_revision" : "initial",
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        createdVersion?: { id: string; body: string };
      };
      if (!res.ok) {
        throw new Error(json.error ?? campaignProductionConfig.updateFailedMessage);
      }
      if (json.createdVersion) {
        onVersionSaved(json.createdVersion.id, json.createdVersion.body);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : campaignProductionConfig.updateFailedMessage,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fr-production-work" aria-label={campaignProductionConfig.panelTitle}>
      <p className="fr-production-work__title">{campaignProductionConfig.panelTitle}</p>
      <p className="fr-tasks-row__meta">{campaignProductionConfig.panelLead}</p>

      {view.workUnitStatusLabel ? (
        <p className="fr-tasks-row__meta">
          Work unit: {view.workUnitStatusLabel}
          {view.stageLabel ? ` · ${view.stageLabel}` : ""}
        </p>
      ) : null}

      {view.deliverableKeys.length > 0 ? (
        <p className="fr-tasks-row__meta">
          {campaignProductionConfig.deliverableKeysLabel}: {view.deliverableKeys.join(", ")}
        </p>
      ) : null}

      {view.blockedMessage ? (
        <p className="fr-tasks-row__block-reason" role="status">
          {view.blockedMessage}
        </p>
      ) : null}

      {view.currentVersionId ? (
        <p className="fr-production-work__version-id">
          <span className="fr-tasks-row__meta">{campaignProductionConfig.currentVersionLabel}</span>
          <code className="fr-production-work__code">{view.currentVersionId}</code>
        </p>
      ) : null}

      {view.canEdit ? (
        <>
          <label className="fr-production-work__field">
            <span className="fr-tasks-row__meta">Work body</span>
            <textarea
              className="fr-production-work__textarea"
              rows={6}
              value={body}
              disabled={busy}
              placeholder={campaignProductionConfig.emptyBodyPlaceholder}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <div className="fr-production-work__actions">
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={busy || !body.trim()}
              onClick={() => void saveVersion()}
            >
              {busy ? campaignProductionConfig.savingLabel : campaignProductionConfig.saveVersionLabel}
            </button>
          </div>
        </>
      ) : view.currentBody ? (
        <pre className="fr-production-work__readonly">{view.currentBody}</pre>
      ) : null}

      <div className="fr-production-work__history">
        <p className="fr-tasks-row__meta">{campaignProductionConfig.versionHistoryLabel}</p>
        {view.versions.length === 0 ? (
          <p className="fr-tasks-row__meta">{campaignProductionConfig.noVersionsLabel}</p>
        ) : (
          <ul className="fr-production-work__version-list">
            {view.versions.map((version) => (
              <li key={version.id} className="fr-production-work__version-item">
                <span className="fr-production-work__version-summary">
                  {version.reasonLabel}
                  {version.isCurrent ? " (current)" : ""}
                  {version.qaPinned && version.qaActionLabel ? ` · ${version.qaActionLabel}` : ""}
                </span>
                <span className="fr-tasks-row__meta">
                  {version.createdByDisplayName} · {version.bodyPreview}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {view.currentVersionId ? (
        <p className="fr-tasks-row__meta">{campaignProductionConfig.workVersionIdHelper}</p>
      ) : null}

      {error ? (
        <p className="fr-tasks-row__meta" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
