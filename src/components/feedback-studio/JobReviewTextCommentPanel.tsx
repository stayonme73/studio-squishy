"use client";

import { useState } from "react";

import { feedbackStudio } from "@/config/feedback-studio";
import type { VersionCompareProof } from "@/lib/job-control/version-compare";
import type { JobReviewTextComment } from "@/lib/job-control/review-feedback-types";
import {
  buildTextCommentRecord,
  canTextCommentOnDeliverable,
  filterTextCommentsForProof,
  removeTextComment,
  upsertTextComment,
} from "@/lib/job-control/review-text-comments";

type Props = {
  jobId: string;
  deliverableKey: string;
  proofFiles: readonly VersionCompareProof[];
  selectedProofId: string | null;
  comments: readonly JobReviewTextComment[];
  onSelectProof: (proofFileId: string) => void;
  onCommentsChange: (next: readonly JobReviewTextComment[]) => void;
};

export default function JobReviewTextCommentPanel({
  jobId,
  deliverableKey,
  proofFiles,
  selectedProofId,
  comments,
  onSelectProof,
  onCommentsChange,
}: Props) {
  const copy = feedbackStudio.textComment;
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!canTextCommentOnDeliverable(proofFiles)) {
    return (
      <div className="fs-text-comment fs-text-comment--unavailable" role="status">
        <p className="fs-text-comment__title">{copy.title}</p>
        <p className="fs-text-comment__unavailable">{copy.unavailable}</p>
      </div>
    );
  }

  const selected =
    proofFiles.find((proof) => proof.id === selectedProofId) ?? proofFiles[0]!;
  const scoped = filterTextCommentsForProof(comments, {
    deliverableKey,
    proofFileId: selected.id,
    versionLabel: selected.versionLabel,
  });

  function saveDraft() {
    const existing = editingId
      ? comments.find((entry) => entry.id === editingId)
      : undefined;
    const record = buildTextCommentRecord({
      id: existing?.id ?? `tc:${deliverableKey}:${selected.id}:${Date.now()}`,
      jobId,
      deliverableKey,
      proofFileId: selected.id,
      versionLabel: selected.versionLabel,
      text: draft,
      createdAt: existing?.createdAt,
    });
    if (!record) return;
    onCommentsChange(upsertTextComment(comments, record));
    setDraft("");
    setEditingId(null);
  }

  function startEdit(entry: JobReviewTextComment) {
    setEditingId(entry.id);
    setDraft(entry.text);
  }

  function remove(entryId: string) {
    onCommentsChange(removeTextComment(comments, entryId));
    if (editingId === entryId) {
      setEditingId(null);
      setDraft("");
    }
  }

  return (
    <div className="fs-text-comment" aria-label={copy.title}>
      <p className="fs-text-comment__title">{copy.title}</p>
      <p className="fs-text-comment__lead">{copy.lead}</p>
      <label className="fs-text-comment__select-label">
        <select
          className="fs-text-comment__select"
          value={selected.id}
          aria-label={copy.selectProof}
          onChange={(event) => {
            onSelectProof(event.target.value);
            setEditingId(null);
            setDraft("");
          }}
        >
          {proofFiles.map((proof) => (
            <option key={proof.id} value={proof.id}>
              {proof.versionLabel || "(no version label)"} · {proof.filename}
            </option>
          ))}
        </select>
      </label>
      <p className="fs-text-comment__bound">
        Bound to {selected.filename}
        {selected.versionLabel ? ` · ${selected.versionLabel}` : ""}
      </p>
      <p className="fs-text-comment__note">{copy.boundNote}</p>

      <ul className="fs-text-comment__list" aria-label="Comments for this proof version">
        {scoped.length === 0 ? (
          <li className="fs-text-comment__empty">{copy.emptyList}</li>
        ) : (
          scoped.map((entry) => (
            <li key={entry.id} className="fs-text-comment__item">
              <p className="fs-text-comment__item-text">{entry.text}</p>
              <div className="fs-text-comment__item-actions">
                <button type="button" onClick={() => startEdit(entry)}>
                  Edit
                </button>
                <button type="button" onClick={() => remove(entry.id)}>
                  {copy.remove}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <textarea
        className="fs-text-comment__input"
        rows={3}
        value={draft}
        placeholder={copy.placeholder}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button
        type="button"
        className="fs-text-comment__save"
        onClick={saveDraft}
        disabled={!draft.trim()}
      >
        {editingId ? copy.update : copy.save}
      </button>
    </div>
  );
}
