"use client";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import type { FileRoomExceptionOperatorContext } from "@/lib/campaign-tasks/exceptions-view";

export type AssignExceptionFormState = {
  assignToUserId: string;
  notes: string;
};

export const emptyAssignExceptionForm = (): AssignExceptionFormState => ({
  assignToUserId: "",
  notes: "",
});

type FileRoomExceptionAssignPanelProps = {
  form: AssignExceptionFormState;
  busy: boolean;
  operatorContext: FileRoomExceptionOperatorContext;
  onChange: (next: AssignExceptionFormState) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function FileRoomExceptionAssignPanel({
  form,
  busy,
  operatorContext,
  onChange,
  onConfirm,
  onCancel,
}: FileRoomExceptionAssignPanelProps) {
  const canSubmit = Boolean(form.assignToUserId);

  return (
    <div className="fr-exception-panel">
      <label className="fr-exception-panel__field">
        <span>{campaignExceptionsConfig.assignToLabel}</span>
        <select
          className="fr-exception-panel__select"
          value={form.assignToUserId}
          disabled={busy}
          onChange={(event) => onChange({ ...form, assignToUserId: event.target.value })}
        >
          <option value="">Select assignee</option>
          {operatorContext.assignCandidates.map((candidate) => (
            <option key={candidate.userId} value={candidate.userId}>
              {candidate.displayName}
              {candidate.isOwner ? " (Owner)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="fr-exception-panel__field">
        <span>{campaignExceptionsConfig.assignNotesLabel}</span>
        <textarea
          className="fr-exception-panel__textarea"
          value={form.notes}
          disabled={busy}
          rows={2}
          placeholder={campaignExceptionsConfig.assignNotesPlaceholder}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
        />
      </label>

      <div className="fr-exception-panel__actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy || !canSubmit}
          onClick={onConfirm}
        >
          {campaignExceptionsConfig.assignLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
