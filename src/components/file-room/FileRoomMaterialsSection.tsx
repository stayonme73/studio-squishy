"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { materialStatusLabel, materialsConfig } from "@/config/materials";
import type { FileRoomMaterialsView } from "@/lib/materials/materials-view";
import type { MaterialReviewStatus } from "@/lib/materials/types";

import FileRoomSectionCard from "./FileRoomSectionCard";

type FileRoomMaterialsSectionProps = {
  campaignId: string;
  materials: FileRoomMaterialsView;
  canReview: boolean;
};

type ReviewAction = Extract<
  MaterialReviewStatus,
  "approved_for_use" | "needs_clarification" | "not_needed"
>;

function MaterialRow({
  campaignId,
  canReview,
  item,
}: {
  campaignId: string;
  canReview: boolean;
  item: FileRoomMaterialsView["groups"][number]["items"][number];
}) {
  const router = useRouter();
  const [teamNote, setTeamNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(item.reviewStatus);

  useEffect(() => {
    setLocalStatus(item.reviewStatus);
  }, [item.reviewStatus]);

  const showReviewActions =
    canReview &&
    (localStatus === "submitted" ||
      localStatus === "needs_clarification" ||
      localStatus === "requested");

  const submitReview = async (reviewStatus: ReviewAction) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/materials`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "team_review",
          itemId: item.id,
          reviewStatus,
          teamNote: reviewStatus === "needs_clarification" ? teamNote : undefined,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? `Review failed (${res.status})`);
      setLocalStatus(reviewStatus);
      router.refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="fr-materials-row">
      <div className="fr-materials-row__head">
        <span className="fr-materials-row__label">{item.label}</span>
        <span
          className={`fr-materials-row__status${item.isBlocking ? " fr-materials-row__status--blocking" : ""}`}
        >
          {materialStatusLabel(localStatus)}
        </span>
      </div>
      <p className="fr-materials-row__meta">
        {item.categoryLabel} · {item.requirementLabel} · Needed for {item.reason}
      </p>
      {item.submittedByLabel ? (
        <p className="fr-materials-row__meta">Submitted by {item.submittedByLabel}</p>
      ) : localStatus === "missing" ? (
        <p className="fr-materials-row__meta">{materialsConfig.noSubmissionLabel}</p>
      ) : null}
      {item.fileName ? (
        <p className="fr-materials-row__value">File: {item.fileName}</p>
      ) : null}
      {item.url ? (
        <p className="fr-materials-row__value">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.url}
          </a>
        </p>
      ) : null}
      {item.text && item.category === "access-instructions" ? (
        <>
          <p className="fr-materials-row__value">{item.text}</p>
          <p className="fr-materials-row__note">{materialsConfig.accessInstructionsNote}</p>
        </>
      ) : item.text ? (
        <p className="fr-materials-row__value">{item.text}</p>
      ) : null}

      {showReviewActions ? (
        <div className="fr-materials-review">
          <label className="fr-materials-review__note">
            <span className="fr-materials-row__meta">{materialsConfig.teamReviewNotePlaceholder}</span>
            <textarea
              className="fr-materials-review__textarea"
              rows={2}
              value={teamNote}
              disabled={busy}
              onChange={(event) => setTeamNote(event.target.value)}
            />
          </label>
          <div className="fr-materials-review__actions">
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={busy}
              onClick={() => void submitReview("approved_for_use")}
            >
              {materialsConfig.teamReviewApproveLabel}
            </button>
            <button
              type="button"
              className="utility-btn"
              disabled={busy}
              onClick={() => void submitReview("needs_clarification")}
            >
              {materialsConfig.teamReviewClarifyLabel}
            </button>
            <button
              type="button"
              className="utility-btn"
              disabled={busy}
              onClick={() => void submitReview("not_needed")}
            >
              {materialsConfig.teamReviewNotNeededLabel}
            </button>
          </div>
          {error ? (
            <p className="fr-materials-row__meta" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function FileRoomMaterialsSection({
  campaignId,
  materials,
  canReview,
}: FileRoomMaterialsSectionProps) {
  if (materials.isEmpty) {
    return (
      <FileRoomSectionCard title={materialsConfig.sectionTitle}>
        <p className="fr-kv-list__value">{materialsConfig.emptyBody}</p>
      </FileRoomSectionCard>
    );
  }

  return (
    <FileRoomSectionCard title={materialsConfig.sectionTitle}>
      {materials.blockingRequiredCount > 0 ? (
        <div className="fr-banner" role="status">
          <strong>{materialsConfig.blockingBannerTitle}</strong>
          {materialsConfig.blockingBannerBody} ({materials.blockingRequiredCount} outstanding)
        </div>
      ) : null}

      {materials.groups.map((group) => (
        <div key={group.category} className="fr-scope-group">
          <p className="fr-scope-group__name">{group.categoryLabel}</p>
          <ul className="fr-materials-list">
            {group.items.map((item) => (
              <MaterialRow
                key={item.id}
                campaignId={campaignId}
                canReview={canReview}
                item={item}
              />
            ))}
          </ul>
        </div>
      ))}
    </FileRoomSectionCard>
  );
}
