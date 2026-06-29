"use client";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";

export type ResolveExceptionFormState = {
  resolutionNotes: string;
};

export const emptyResolveExceptionForm = (): ResolveExceptionFormState => ({
  resolutionNotes: "",
});

type FileRoomExceptionResolvePanelProps = {
  form: ResolveExceptionFormState;
  busy: boolean;
  onChange: (next: ResolveExceptionFormState) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function FileRoomExceptionResolvePanel({
  form,
  busy,
  onChange,
  onConfirm,
  onCancel,
}: FileRoomExceptionResolvePanelProps) {
  return (
    <div className="fr-exception-panel">
      <p className="fr-exception-panel__disclaimer">{campaignExceptionsConfig.resolveDisclaimer}</p>

      <label className="fr-exception-panel__field">
        <span>{campaignExceptionsConfig.resolveNotesLabel}</span>
        <textarea
          className="fr-exception-panel__textarea"
          value={form.resolutionNotes}
          disabled={busy}
          rows={3}
          placeholder={campaignExceptionsConfig.resolveNotesPlaceholder}
          onChange={(event) => onChange({ ...form, resolutionNotes: event.target.value })}
        />
      </label>

      <div className="fr-exception-panel__actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy}
          onClick={onConfirm}
        >
          {campaignExceptionsConfig.resolveLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
